from datetime import datetime
from pydantic import BaseModel


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    budget: float
    agent_model: str | None
    onboarding_complete: bool
    created_at: datetime

    class Config:
        from_attributes = True
