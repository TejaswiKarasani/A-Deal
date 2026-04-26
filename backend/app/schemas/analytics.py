from pydantic import BaseModel


class RunSummaryOut(BaseModel):
    run_id: int
    items_listed: int
    items_sold: int
    sale_rate: float
    total_deals: int
    total_value: float
    mean_price: float
    median_price: float


class AgentPerformanceOut(BaseModel):
    user_id: int
    name: str
    model: str | None
    deals_as_seller: int
    deals_as_buyer: int
    total_earned: float
    total_spent: float
    net: float
