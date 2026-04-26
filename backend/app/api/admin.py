from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.database import get_db
from app.models import Run, User

router = APIRouter(prefix="/admin", tags=["admin"])

VALID_RUN_STATUSES = {"pending", "active", "closed"}


class RunCreate(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    name: str = Field(min_length=1)
    model_assignment: str = "all_opus"
    is_real: bool = False
    is_public: bool = True
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None


class RunUpdate(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    name: Optional[str] = None
    model_assignment: Optional[str] = None
    is_real: Optional[bool] = None
    is_public: Optional[bool] = None
    status: Optional[str] = None
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None


class UserUpdate(BaseModel):
    agent_model: Optional[str] = None


def _run_to_dict(run: Run) -> dict:
    return {
        "id": run.id,
        "name": run.name,
        "model_assignment": run.model_assignment,
        "is_real": run.is_real,
        "is_public": run.is_public,
        "status": run.status,
        "start_at": run.start_at,
        "end_at": run.end_at,
        "created_at": run.created_at,
    }


def _user_to_dict(user: User) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "budget": user.budget,
        "agent_model": user.agent_model,
        "onboarding_complete": bool(user.onboarding_complete),
        "created_at": user.created_at,
    }


@router.post("/runs")
def create_run(
    run_in: RunCreate,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    run = Run(**run_in.model_dump())
    db.add(run)
    db.commit()
    db.refresh(run)
    return _run_to_dict(run)


@router.get("/runs")
def list_runs(
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    runs = db.query(Run).order_by(Run.created_at.desc(), Run.id.desc()).all()
    return [_run_to_dict(run) for run in runs]


@router.patch("/runs/{run_id}")
def update_run(
    run_id: int,
    run_in: RunUpdate,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    run = db.get(Run, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found")

    updates = run_in.model_dump(exclude_unset=True)
    if "status" in updates and updates["status"] not in VALID_RUN_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid run status")
    for field, value in updates.items():
        setattr(run, field, value)

    db.commit()
    db.refresh(run)
    return _run_to_dict(run)


@router.get("/users")
def list_users(
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    users = db.query(User).order_by(User.created_at.desc(), User.id.desc()).all()
    return [_user_to_dict(user) for user in users]


@router.patch("/users/{user_id}")
def update_user(
    user_id: int,
    user_in: UserUpdate,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    user.agent_model = user_in.agent_model
    db.commit()
    db.refresh(user)
    return _user_to_dict(user)
