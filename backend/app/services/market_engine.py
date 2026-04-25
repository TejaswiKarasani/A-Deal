"""
Marketplace engine — orchestrates agent turns, routes offers, and closes deals.

The engine runs as an async loop (or scheduled job).
Each tick it:
1. Picks the next active agent in round-robin order
2. Builds the market context for that agent
3. Asks the agent for an action
4. Applies the action to the database
5. Notifies affected parties
"""
import json
import logging
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models import User, Item, Run, Listing, Negotiation, Message, Deal
from app.agents.trader import decide_action
from app.config import settings

logger = logging.getLogger(__name__)


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
        logger.warning("User %s has no system prompt — skipping turn", user.id)
        return

    market_context = build_market_context(run, db)

    # Gather open negotiations involving this user
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
        history = [
            {"role": msg.role, "content": msg.content}
            for msg in neg.messages
        ]
        action = decide_action(
            system_prompt=user.system_prompt,
            market_context=market_context,
            negotiation_history=history,
            model=user.agent_model or settings.default_agent_model,
        )
        _apply_action(action, user, neg, run, db)

    # If agent has no open negotiations, it may start a new one or post
    if not open_negs:
        action = decide_action(
            system_prompt=user.system_prompt,
            market_context=market_context,
            model=user.agent_model or settings.default_agent_model,
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
        _close_deal(negotiation, offer or _last_offer(negotiation), db)
    elif act == "reject":
        negotiation.status = "rejected"
        negotiation.closed_at = datetime.now(timezone.utc)
        _add_message(negotiation, agent.id, role, "Offer rejected.", db)
    elif act in ("counter", "bid"):
        negotiation.round_count += 1
        if negotiation.round_count >= settings.max_negotiation_rounds:
            negotiation.status = "expired"
            negotiation.closed_at = datetime.now(timezone.utc)
        else:
            _add_message(negotiation, agent.id, role, msg_text, db)
    elif act == "pass":
        pass
    else:
        logger.debug("Unknown action %s from agent %s", act, agent.id)


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
