from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    budget = Column(Float, default=100.0)
    agent_model = Column(String, nullable=True)  # overrides default if set
    system_prompt = Column(Text, nullable=True)  # generated after onboarding
    onboarding_complete = Column(Integer, default=0)  # bool as int for sqlite
    created_at = Column(DateTime, default=datetime.utcnow)
