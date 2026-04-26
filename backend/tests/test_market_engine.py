"""Tests for market engine — deal lifecycle, auto-close, expiry."""
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock

import pytest

from app.models import User, Item, Run, Listing, Negotiation, Message, Deal
from app.services.market_engine import (
    build_market_context,
    close_expired_runs,
    expire_stale_negotiations,
    _close_deal,
    _last_offer,
    run_agent_turn,
)


def _make_user(db, name="Alice", email="alice@test.com"):
    u = User(
        name=name, email=email,
        hashed_password="x",
        system_prompt="You are a trader.",
        onboarding_complete=1,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


def _make_run(db, status="active", end_at=None):
    r = Run(name="Test Run", status=status, end_at=end_at)
    db.add(r)
    db.commit()
    db.refresh(r)
    return r


def _make_item(db, seller_id, asking=20.0, min_price=10.0):
    i = Item(
        seller_id=seller_id, name="Widget",
        asking_price=asking, min_price=min_price, status="available",
    )
    db.add(i)
    db.commit()
    db.refresh(i)
    return i


def _make_listing(db, run_id, item_id, agent_id):
    l = Listing(run_id=run_id, item_id=item_id, agent_id=agent_id, status="active")
    db.add(l)
    db.commit()
    db.refresh(l)
    return l


def _make_negotiation(db, run_id, listing_id, buyer_id, seller_id, status="open", rounds=0):
    n = Negotiation(
        run_id=run_id, listing_id=listing_id,
        buyer_id=buyer_id, seller_id=seller_id,
        status=status, round_count=rounds,
    )
    db.add(n)
    db.commit()
    db.refresh(n)
    return n


# ── build_market_context ──────────────────────────────────────────────────────

def test_build_market_context_empty(db_session):
    run = _make_run(db_session)
    ctx = build_market_context(run, db_session)
    assert ctx == "No items currently listed."


def test_build_market_context_lists_items(db_session):
    seller = _make_user(db_session)
    run = _make_run(db_session)
    item = _make_item(db_session, seller.id)
    _make_listing(db_session, run.id, item.id, seller.id)
    ctx = build_market_context(run, db_session)
    assert "Widget" in ctx
    assert "$20.00" in ctx


# ── close_expired_runs ────────────────────────────────────────────────────────

def test_close_expired_runs_closes_past_deadline(db_session):
    past = datetime.now(timezone.utc) - timedelta(minutes=5)
    run = _make_run(db_session, status="active", end_at=past)
    close_expired_runs(db_session)
    db_session.refresh(run)
    assert run.status == "closed"


def test_close_expired_runs_ignores_future(db_session):
    future = datetime.now(timezone.utc) + timedelta(hours=1)
    run = _make_run(db_session, status="active", end_at=future)
    close_expired_runs(db_session)
    db_session.refresh(run)
    assert run.status == "active"


def test_close_expired_runs_ignores_no_end_at(db_session):
    run = _make_run(db_session, status="active", end_at=None)
    close_expired_runs(db_session)
    db_session.refresh(run)
    assert run.status == "active"


# ── expire_stale_negotiations ─────────────────────────────────────────────────

def test_expire_stale_negotiations(db_session):
    from app.config import settings
    seller = _make_user(db_session)
    buyer = _make_user(db_session, name="Bob", email="bob@test.com")
    run = _make_run(db_session)
    item = _make_item(db_session, seller.id)
    listing = _make_listing(db_session, run.id, item.id, seller.id)
    neg = _make_negotiation(
        db_session, run.id, listing.id, buyer.id, seller.id,
        rounds=settings.max_negotiation_rounds,
    )
    expire_stale_negotiations(db_session)
    db_session.refresh(neg)
    assert neg.status == "expired"


# ── _close_deal ───────────────────────────────────────────────────────────────

def test_close_deal_marks_sold(db_session):
    seller = _make_user(db_session)
    buyer = _make_user(db_session, name="Bob", email="bob@test.com")
    run = _make_run(db_session)
    item = _make_item(db_session, seller.id)
    listing = _make_listing(db_session, run.id, item.id, seller.id)
    neg = _make_negotiation(db_session, run.id, listing.id, buyer.id, seller.id)

    _close_deal(neg, 15.0, db_session)
    db_session.commit()

    db_session.refresh(neg)
    db_session.refresh(listing)
    db_session.refresh(item)
    deal = db_session.query(Deal).filter(Deal.negotiation_id == neg.id).first()

    assert neg.status == "accepted"
    assert listing.status == "sold"
    assert item.status == "sold"
    assert deal is not None
    assert deal.final_price == 15.0


# ── _last_offer ───────────────────────────────────────────────────────────────

def test_last_offer_extracts_from_json_message(db_session):
    import json
    seller = _make_user(db_session)
    buyer = _make_user(db_session, name="Bob", email="bob@test.com")
    run = _make_run(db_session)
    item = _make_item(db_session, seller.id)
    listing = _make_listing(db_session, run.id, item.id, seller.id)
    neg = _make_negotiation(db_session, run.id, listing.id, buyer.id, seller.id)

    msg = Message(
        negotiation_id=neg.id,
        sender_id=buyer.id,
        role="buyer",
        content=json.dumps({"offer_price": 18.5, "message": "How about this?"}),
    )
    db_session.add(msg)
    db_session.commit()
    db_session.refresh(neg)

    price = _last_offer(neg)
    assert price == 18.5


def test_last_offer_falls_back_to_asking_price(db_session):
    seller = _make_user(db_session)
    buyer = _make_user(db_session, name="Bob", email="bob@test.com")
    run = _make_run(db_session)
    item = _make_item(db_session, seller.id, asking=25.0)
    listing = _make_listing(db_session, run.id, item.id, seller.id)
    neg = _make_negotiation(db_session, run.id, listing.id, buyer.id, seller.id)

    price = _last_offer(neg)
    assert price == 25.0


# ── run_agent_turn ────────────────────────────────────────────────────────────

def test_run_agent_turn_skips_user_without_prompt(db_session):
    user = User(name="NoPrompt", email="noprompt@test.com", hashed_password="x")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    run = _make_run(db_session)

    with patch("app.services.market_engine.decide_action") as mock_decide:
        run_agent_turn(user, run, db_session)
        mock_decide.assert_not_called()


def test_run_agent_turn_calls_decide_action(db_session):
    seller = _make_user(db_session)
    buyer = _make_user(db_session, name="Bob", email="bob@test.com")
    buyer.system_prompt = "Trade well."
    db_session.commit()

    run = _make_run(db_session)
    item = _make_item(db_session, seller.id)
    listing = _make_listing(db_session, run.id, item.id, seller.id)
    _make_negotiation(db_session, run.id, listing.id, buyer.id, seller.id)

    mock_action = {"action": "pass", "target_listing_id": None, "offer_price": None, "message": ""}
    with patch("app.services.market_engine.decide_action", return_value=mock_action):
        run_agent_turn(buyer, run, db_session)
