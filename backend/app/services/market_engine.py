"""
Marketplace engine — orchestrates agent turns, routes offers, and closes deals.
"""
import json
import logging
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models import User, Item, Run, Listing, Negotiation, Message, Deal
from app.agents.trader import decide_action
from app.config import settings

logger = logging.getLogger(__name__)


def close_expired_runs(db: Session) -> None:
    """Close any active runs whose end_at deadline has passed."""
    now = datetime.now(timezone.utc)
    expired = (
        db.query(Run)
        .filter(Run.status == "active", Run.end_at.isnot(None), Run.end_at < now)
        .all()
    )
    for run in expired:
        run.status = "closed"
        logger.info("run_closed run_id=%s name=%s", run.id, run.name)
    if expired:
        db.commit()


def expire_stale_negotiations(db: Session) -> None:
    """Expire open negotiations that have hit the round limit."""
    stale = (
        db.query(Negotiation)
        .filter(
            Negotiation.status == "open",
            Negotiation.round_count >= settings.max_negotiation_rounds,
        )
        .all()
    )
    for neg in stale:
        neg.status = "expired"
        neg.closed_at = datetime.now(timezone.utc)
        logger.info(
            "negotiation_expired negotiation_id=%s run_id=%s rounds=%s",
            neg.id, neg.run_id, neg.round_count,
        )
    if stale:
        db.commit()


def build_market_context(run: Run, db: Session) -> str:
    """Return a text summary of all active listings for the given run."""
    listings = (
        db.query(Listing)
        .filter(Listing.run_id == run.id, Listing.status == "active")
        .all()
    )
    if not listings:
        return "No items currently listed."

    lines = ["Active listings:"]
    for listing in listings:
        item = listing.item
        lines.append(
            f"[ID:{listing.id}] {item.name} — ${item.asking_price:.2f} "
            f"(seller: user#{listing.agent_id}) | {item.description or ''}"
        )
    return "\n".join(lines)


def run_agent_turn(user: User, run: Run, db: Session) -> None:
    """Execute one turn for a single agent in the given run."""
    if not user.system_prompt:
        logger.warning("skipping_turn user_id=%s reason=no_system_prompt", user.id)
        return

    market_context = build_market_context(run, db)

    open_negs = (
        db.query(Negotiation)
        .filter(
            Negotiation.run_id == run.id,
            Negotiation.status == "open",
            (Negotiation.buyer_id == user.id) | (Negotiation.seller_id == user.id),
        )
        .all()
    )

    for neg in open_negs:
        history = [{"role": msg.role, "content": msg.content} for msg in neg.messages]
        action = decide_action(
            system_prompt=user.system_prompt,
            market_context=market_context,
            negotiation_history=history,
            model=user.agent_model or settings.default_agent_model,
        )
        logger.info(
            "agent_action user_id=%s run_id=%s negotiation_id=%s action=%s",
            user.id, run.id, neg.id, action.get("action"),
        )
        _apply_action(action, user, neg, run, db)

    if not open_negs:
        action = decide_action(
            system_prompt=user.system_prompt,
            market_context=market_context,
            model=user.agent_model or settings.default_agent_model,
        )
        logger.info(
            "agent_new_action user_id=%s run_id=%s action=%s",
            user.id, run.id, action.get("action"),
        )
        _apply_new_action(action, user, run, db)

    db.commit()


def _apply_action(
    action: dict,
    agent: User,
    negotiation: Negotiation,
    run: Run,
    db: Session,
) -> None:
    act = action.get("action")
    msg_text = action.get("message", "")
    offer = action.get("offer_price")
    role = "buyer" if negotiation.buyer_id == agent.id else "seller"

    if act == "accept":
        price = offer or _last_offer(negotiation)
        _close_deal(negotiation, price, db)
        logger.info(
            "deal_closed negotiation_id=%s price=%s buyer_id=%s seller_id=%s",
            negotiation.id, price, negotiation.buyer_id, negotiation.seller_id,
        )
    elif act == "reject":
        negotiation.status = "rejected"
        negotiation.closed_at = datetime.now(timezone.utc)
        _add_message(negotiation, agent.id, role, "Offer rejected.", db)
    elif act in ("counter", "bid"):
        negotiation.round_count += 1
        if negotiation.round_count >= settings.max_negotiation_rounds:
            negotiation.status = "expired"
            negotiation.closed_at = datetime.now(timezone.utc)
            logger.info(
                "negotiation_expired negotiation_id=%s max_rounds=%s",
                negotiation.id, settings.max_negotiation_rounds,
            )
        else:
            _add_message(negotiation, agent.id, role, msg_text, db)
    elif act == "pass":
        pass
    else:
        logger.debug("unknown_action action=%s user_id=%s", act, agent.id)


def _apply_new_action(action: dict, agent: User, run: Run, db: Session) -> None:
    act = action.get("action")

    if act == "bid":
        target_id = action.get("target_listing_id")
        if not target_id:
            return
        listing = db.query(Listing).filter(
            Listing.id == target_id, Listing.run_id == run.id, Listing.status == "active"
        ).first()
        if not listing or listing.agent_id == agent.id:
            return

        neg = Negotiation(
            run_id=run.id,
            listing_id=listing.id,
            buyer_id=agent.id,
            seller_id=listing.agent_id,
            status="open",
        )
        db.add(neg)
        db.flush()
        _add_message(neg, agent.id, "buyer", action.get("message", ""), db)
        logger.info(
            "negotiation_started buyer_id=%s seller_id=%s listing_id=%s run_id=%s",
            agent.id, listing.agent_id, listing.id, run.id,
        )


def _close_deal(negotiation: Negotiation, price: float, db: Session) -> None:
    negotiation.status = "accepted"
    negotiation.closed_at = datetime.now(timezone.utc)
    listing = negotiation.listing
    listing.status = "sold"
    listing.item.status = "sold"
    deal = Deal(negotiation_id=negotiation.id, final_price=price)
    db.add(deal)


def _add_message(
    negotiation: Negotiation, sender_id: int, role: str, content: str, db: Session
) -> None:
    msg = Message(
        negotiation_id=negotiation.id,
        sender_id=sender_id,
        role=role,
        content=content,
    )
    db.add(msg)


def _last_offer(negotiation: Negotiation) -> float:
    for msg in reversed(negotiation.messages):
        try:
            data = json.loads(msg.content)
            if "offer_price" in data:
                return float(data["offer_price"])
        except (json.JSONDecodeError, TypeError):
            pass
    return negotiation.listing.item.asking_price
