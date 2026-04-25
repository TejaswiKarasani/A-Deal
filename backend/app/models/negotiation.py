from datetime import datetime
from sqlalchemy import Column, Integer, ForeignKey, String, DateTime, Float, Text
from sqlalchemy.orm import relationship
from app.database import Base


class Negotiation(Base):
    __tablename__ = "negotiations"

    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(Integer, ForeignKey("runs.id"), nullable=False)
    listing_id = Column(Integer, ForeignKey("listings.id"), nullable=False)
    buyer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    seller_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    # open | accepted | rejected | expired
    status = Column(String, default="open")
    round_count = Column(Integer, default=0)
    started_at = Column(DateTime, default=datetime.utcnow)
    closed_at = Column(DateTime, nullable=True)

    run = relationship("Run")
    listing = relationship("Listing")
    buyer = relationship("User", foreign_keys=[buyer_id])
    seller = relationship("User", foreign_keys=[seller_id])
    messages = relationship("Message", back_populates="negotiation", order_by="Message.timestamp")
    deal = relationship("Deal", back_populates="negotiation", uselist=False)


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    negotiation_id = Column(Integer, ForeignKey("negotiations.id"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(String, nullable=False)   # buyer | seller
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

    negotiation = relationship("Negotiation", back_populates="messages")
    sender = relationship("User")


class Deal(Base):
    __tablename__ = "deals"

    id = Column(Integer, primary_key=True, index=True)
    negotiation_id = Column(Integer, ForeignKey("negotiations.id"), nullable=False)
    final_price = Column(Float, nullable=False)
    closed_at = Column(DateTime, default=datetime.utcnow)

    negotiation = relationship("Negotiation", back_populates="deal")


class SurveyResponse(Base):
    __tablename__ = "survey_responses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    run_id = Column(Integer, ForeignKey("runs.id"), nullable=False)
    overall_satisfaction = Column(Integer, nullable=True)  # 1-7
    fairness_scores = Column(Text, nullable=True)          # JSON: {deal_id: score}
    preferred_run_rank = Column(Text, nullable=True)        # JSON: [run_id, ...]
    willing_to_pay = Column(Integer, nullable=True)         # bool
    wtp_amount = Column(Float, nullable=True)
    submitted_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
    run = relationship("Run")
