"""Compute deal statistics for a given run or across all runs."""
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models import Deal, Negotiation, Listing, User, Run


def run_summary(run_id: int, db: Session) -> dict:
    listings = db.query(Listing).filter(Listing.run_id == run_id).count()
    sold = db.query(Listing).filter(Listing.run_id == run_id, Listing.status == "sold").count()

    deals = (
        db.query(Deal)
        .join(Negotiation, Deal.negotiation_id == Negotiation.id)
        .filter(Negotiation.run_id == run_id)
        .all()
    )
    total_value = sum(d.final_price for d in deals)
    mean_price = total_value / len(deals) if deals else 0
    prices = sorted(d.final_price for d in deals)
    median_price = prices[len(prices) // 2] if prices else 0

    return {
        "run_id": run_id,
        "items_listed": listings,
        "items_sold": sold,
        "sale_rate": round(sold / listings, 3) if listings else 0,
        "total_deals": len(deals),
        "total_value": round(total_value, 2),
        "mean_price": round(mean_price, 2),
        "median_price": round(median_price, 2),
    }


def agent_performance(run_id: int, db: Session) -> list[dict]:
    """Per-agent deal stats for the run."""
    users = db.query(User).all()
    results = []
    for user in users:
        as_seller = (
            db.query(Deal)
            .join(Negotiation, Deal.negotiation_id == Negotiation.id)
            .filter(Negotiation.run_id == run_id, Negotiation.seller_id == user.id)
            .all()
        )
        as_buyer = (
            db.query(Deal)
            .join(Negotiation, Deal.negotiation_id == Negotiation.id)
            .filter(Negotiation.run_id == run_id, Negotiation.buyer_id == user.id)
            .all()
        )
        total_earned = sum(d.final_price for d in as_seller)
        total_spent = sum(d.final_price for d in as_buyer)
        results.append(
            {
                "user_id": user.id,
                "name": user.name,
                "model": user.agent_model,
                "deals_as_seller": len(as_seller),
                "deals_as_buyer": len(as_buyer),
                "total_earned": round(total_earned, 2),
                "total_spent": round(total_spent, 2),
                "net": round(total_earned - total_spent, 2),
            }
        )
    return results
