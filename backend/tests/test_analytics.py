"""Tests for analytics service."""
from app.models import User, Item, Run, Listing, Negotiation, Deal
from app.services.analytics import run_summary, agent_performance


def _seed(db):
    seller = User(name="Seller", email="seller@test.com", hashed_password="x")
    buyer = User(name="Buyer", email="buyer@test.com", hashed_password="x")
    db.add_all([seller, buyer])
    db.commit()
    db.refresh(seller)
    db.refresh(buyer)

    run = Run(name="R1", status="closed")
    db.add(run)
    db.commit()
    db.refresh(run)

    item = Item(seller_id=seller.id, name="Lamp", asking_price=30.0, min_price=15.0, status="sold")
    db.add(item)
    db.commit()
    db.refresh(item)

    listing = Listing(run_id=run.id, item_id=item.id, agent_id=seller.id, status="sold")
    db.add(listing)
    db.commit()
    db.refresh(listing)

    neg = Negotiation(
        run_id=run.id, listing_id=listing.id,
        buyer_id=buyer.id, seller_id=seller.id, status="accepted",
    )
    db.add(neg)
    db.commit()
    db.refresh(neg)

    deal = Deal(negotiation_id=neg.id, final_price=22.0)
    db.add(deal)
    db.commit()

    return run, seller, buyer


def test_run_summary(db_session):
    run, _, _ = _seed(db_session)
    summary = run_summary(run.id, db_session)
    assert summary["total_deals"] == 1
    assert summary["total_value"] == 22.0
    assert summary["mean_price"] == 22.0
    assert summary["items_sold"] == 1
    assert summary["sale_rate"] == 1.0


def test_agent_performance(db_session):
    run, seller, buyer = _seed(db_session)
    perf = agent_performance(run.id, db_session)
    seller_row = next(p for p in perf if p["user_id"] == seller.id)
    buyer_row = next(p for p in perf if p["user_id"] == buyer.id)
    assert seller_row["deals_as_seller"] == 1
    assert seller_row["total_earned"] == 22.0
    assert buyer_row["deals_as_buyer"] == 1
    assert buyer_row["total_spent"] == 22.0
