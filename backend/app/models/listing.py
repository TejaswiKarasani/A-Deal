from datetime import datetime
from sqlalchemy import Column, Integer, ForeignKey, String, DateTime
from sqlalchemy.orm import relationship
from app.database import Base


class Listing(Base):
    __tablename__ = "listings"

    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(Integer, ForeignKey("runs.id"), nullable=False)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=False)
    agent_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String, default="active")  # active | sold | withdrawn
    listed_at = Column(DateTime, default=datetime.utcnow)

    run = relationship("Run")
    item = relationship("Item", back_populates="listings")
    agent = relationship("User")
