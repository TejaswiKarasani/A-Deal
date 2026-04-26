import json
from statistics import mean
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.database import get_db
from app.models import Run, SurveyResponse, User

router = APIRouter(tags=["survey"])


class SurveySubmit(BaseModel):
    overall_satisfaction: int = Field(ge=1, le=7)
    fairness_scores: dict[str, int] = Field(default_factory=dict)
    preferred_run_rank: list[int] = Field(default_factory=list)
    willing_to_pay: bool
    wtp_amount: Optional[float] = Field(default=None, ge=0)


def _survey_to_dict(response: SurveyResponse) -> dict:
    return {
        "id": response.id,
        "user_id": response.user_id,
        "run_id": response.run_id,
        "overall_satisfaction": response.overall_satisfaction,
        "fairness_scores": json.loads(response.fairness_scores or "{}"),
        "preferred_run_rank": json.loads(response.preferred_run_rank or "[]"),
        "willing_to_pay": bool(response.willing_to_pay),
        "wtp_amount": response.wtp_amount,
        "submitted_at": response.submitted_at,
    }


@router.post("/survey/runs/{run_id}/submit")
def submit_survey(
    run_id: int,
    payload: SurveySubmit,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    run = db.get(Run, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found")

    existing = (
        db.query(SurveyResponse)
        .filter(SurveyResponse.run_id == run_id, SurveyResponse.user_id == current_user.id)
        .first()
    )
    if existing is not None:
        raise HTTPException(status_code=400, detail="Survey already submitted for this run")

    response = SurveyResponse(
        user_id=current_user.id,
        run_id=run_id,
        overall_satisfaction=payload.overall_satisfaction,
        fairness_scores=json.dumps(payload.fairness_scores),
        preferred_run_rank=json.dumps(payload.preferred_run_rank),
        willing_to_pay=1 if payload.willing_to_pay else 0,
        wtp_amount=payload.wtp_amount,
    )
    db.add(response)
    db.commit()
    db.refresh(response)
    return _survey_to_dict(response)


@router.get("/survey/runs/{run_id}/my")
def get_my_survey(
    run_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    response = (
        db.query(SurveyResponse)
        .filter(SurveyResponse.run_id == run_id, SurveyResponse.user_id == current_user.id)
        .first()
    )
    if response is None:
        raise HTTPException(status_code=404, detail="Survey response not found")
    return _survey_to_dict(response)


@router.get("/admin/survey/runs/{run_id}")
def get_survey_aggregate(
    run_id: int,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    responses = db.query(SurveyResponse).filter(SurveyResponse.run_id == run_id).all()
    if not responses:
        return {
            "run_id": run_id,
            "response_count": 0,
            "mean_satisfaction": None,
            "mean_fairness": None,
            "wtp_percentage": 0,
        }

    satisfaction_values = [r.overall_satisfaction for r in responses if r.overall_satisfaction is not None]
    fairness_values: list[int] = []
    wtp_yes = 0
    for response in responses:
        fairness_values.extend(json.loads(response.fairness_scores or "{}").values())
        if response.willing_to_pay:
            wtp_yes += 1

    return {
        "run_id": run_id,
        "response_count": len(responses),
        "mean_satisfaction": mean(satisfaction_values) if satisfaction_values else None,
        "mean_fairness": mean(fairness_values) if fairness_values else None,
        "wtp_percentage": (wtp_yes / len(responses)) * 100,
    }
