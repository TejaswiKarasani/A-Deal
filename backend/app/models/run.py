from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Boolean
from app.database import Base


class Run(Base):
    __tablename__ = "runs"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    # all_opus | all_haiku | mixed_50_50 | custom
    model_assignment = Column(String, default="all_opus")
    is_real = Column(Boolean, default=False)   # the run whose deals are executed
    is_public = Column(Boolean, default=True)  # visible on marketplace feed
    status = Column(String, default="pending") # pending | active | closed
    start_at = Column(DateTime, nullable=True)
    end_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
