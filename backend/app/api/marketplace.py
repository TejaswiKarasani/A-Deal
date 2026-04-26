from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.database import get_db
from app.models import User, Run, Listing, Item, Negotiation, Message, Deal
from app.schemas import RunOut, ListingOut, DealOut, NegotiationOut

router = APIRouter(prefix="/marketplace", tags=["marketplace"])


@router.get("/runs", response_model=list[RunOut])
def list_runs(db: Session = Depends(get_db)):
    runs = db.query(Run).all()
    return [RunOut.model_validate(r) for r in runs if r.is_public]


@router.get("/runs/{run_id}/listings")
def get_listings(run_id: int, db: Session = Depends(get_db)):
    listings = (
        db.query(Listing)
        .filter(Listing.run_id == run_id, Listing.status == "active")
        .all()
    )
    return [
        {
            "listing_id": l.id,
            "item_id": l.item_id,
            "name": l.item.name,
            "description": l.item.description,
            "category": l.item.category,
            "asking_price": l.item.asking_price,
            "seller_id": l.agent_id,
            "listed_at": l.listed_at,
        }
        for l in listings
    ]


@router.get("/runs/{run_id}/deals")
def get_deals(run_id: int, db: Session = Depends(get_db)):
    deals = (
        db.query(Deal)
        .join(Negotiation, Deal.negotiation_id == Negotiation.id)
        .filter(Negotiation.run_id == run_id)
        .all()
    )
    return [
        {
            "deal_id": d.id,
            "negotiation_id": d.negotiation_id,
            "item": d.negotiation.listing.item.name,
            "buyer_id": d.negotiation.buyer_id,
            "seller_id": d.negotiation.seller_id,
            "final_price": d.final_price,
            "closed_at": d.closed_at,
        }
        for d in deals
    ]


@router.get("/runs/{run_id}/negotiations/{negotiation_id}")
def get_negotiation(
    run_id: int,
    negotiation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    neg = db.query(Negotiation).filter(
        Negotiation.id == negotiation_id,
        Negotiation.run_id == run_id,
    ).first()
    if not neg:
        raise HTTPException(status_code=404, detail="Negotiation not found")
    if current_user.id not in (neg.buyer_id, neg.seller_id):
        raise HTTPException(status_code=403, detail="Not your negotiation")
    return {
        "id": neg.id,
        "status": neg.status,
        "item": neg.listing.item.name,
        "buyer_id": neg.buyer_id,
        "seller_id": neg.seller_id,
        "round_count": neg.round_count,
        "messages": [
            {"role": m.role, "content": m.content, "timestamp": m.timestamp}
            for m in neg.messages
        ],
    }


@router.get("/my/deals")
def my_deals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    as_seller = (
        db.query(Deal)
        .join(Negotiation, Deal.negotiation_id == Negotiation.id)
        .filter(Negotiation.seller_id == current_user.id)
        .all()
    )
    as_buyer = (
        db.query(Deal)
        .join(Negotiation, Deal.negotiation_id == Negotiation.id)
        .filter(Negotiation.buyer_id == current_user.id)
        .all()
    )
    return {
        "sold": [
            {
                "item": d.negotiation.listing.item.name,
                "price": d.final_price,
                "buyer_id": d.negotiation.buyer_id,
            }
            for d in as_seller
        ],
        "bought": [
            {
                "item": d.negotiation.listing.item.name,
                "price": d.final_price,
                "seller_id": d.negotiation.seller_id,
            }
            for d in as_buyer
        ],
    }
