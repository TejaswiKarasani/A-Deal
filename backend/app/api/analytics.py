from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.analytics import run_summary, agent_performance
from app.schemas import RunSummaryOut, AgentPerformanceOut

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/runs/{run_id}/summary", response_model=RunSummaryOut)
def get_run_summary(run_id: int, db: Session = Depends(get_db)):
    return run_summary(run_id, db)


@router.get("/runs/{run_id}/agents", response_model=list[AgentPerformanceOut])
def get_agent_performance(run_id: int, db: Session = Depends(get_db)):
    return agent_performance(run_id, db)
