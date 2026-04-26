from datetime import datetime
from pydantic import BaseModel


class RunOut(BaseModel):
    id: int
    name: str
    model_assignment: str
    is_public: bool
    status: str
    start_at: datetime | None = None
    end_at: datetime | None = None

    class Config:
        from_attributes = True


class ListingOut(BaseModel):
    listing_id: int
    item_id: int
    name: str
    description: str | None
    category: str | None
    asking_price: float
    seller_id: int
    listed_at: datetime

    class Config:
        from_attributes = True


class DealOut(BaseModel):
    deal_id: int
    negotiation_id: int
    item: str
    buyer_id: int
    seller_id: int
    final_price: float
    closed_at: datetime

    class Config:
        from_attributes = True


class MessageOut(BaseModel):
    role: str
    content: str
    timestamp: datetime

    class Config:
        from_attributes = True


class NegotiationOut(BaseModel):
    id: int
    status: str
    item: str
    buyer_id: int
    seller_id: int
    round_count: int
    messages: list[MessageOut]

    class Config:
        from_attributes = True
