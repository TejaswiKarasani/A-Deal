"""
Onboarding endpoints — drive the conversational interview and persist the user profile.
"""
import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.database import get_db
from app.models import User, Item
from app.agents.interviewer import conduct_interview_turn, extract_profile_from_conversation
from app.agents.trader import build_system_prompt_for_user

router = APIRouter(prefix="/onboarding", tags=["onboarding"])


class InterviewMessage(BaseModel):
    message: str
    history: list[dict]  # [{"role": "user"|"assistant", "content": "..."}]


class InterviewResponse(BaseModel):
    reply: str
    history: list[dict]
    profile_ready: bool
    profile: dict | None


@router.post("/chat", response_model=InterviewResponse)
def interview_turn(
    body: InterviewMessage,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    reply = conduct_interview_turn(body.history, body.message)
    new_history = body.history + [
        {"role": "user", "content": body.message},
        {"role": "assistant", "content": reply},
    ]

    # Try to extract a complete profile from the conversation
    profile = extract_profile_from_conversation(new_history)
    profile_ready = profile is not None

    return {
        "reply": reply,
        "history": new_history,
        "profile_ready": profile_ready,
        "profile": profile,
    }


class ConfirmProfile(BaseModel):
    profile: dict


@router.post("/confirm")
def confirm_profile(
    body: ConfirmProfile,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """User confirms their extracted profile — persist items and generate the system prompt."""
    profile = body.profile

    # Persist sell items
    for item_data in profile.get("sell_list", []):
        item = Item(
            seller_id=current_user.id,
            name=item_data["name"],
            description=item_data.get("description", ""),
            category=item_data.get("category", "general"),
            asking_price=float(item_data["asking_price"]),
            min_price=float(item_data["min_price"]),
        )
        db.add(item)

    # Generate and store system prompt
    system_prompt = build_system_prompt_for_user(profile)
    current_user.system_prompt = system_prompt
    current_user.onboarding_complete = 1

    db.commit()
    return {"status": "ok", "message": "Profile saved. Your agent is ready."}


@router.get("/status")
def onboarding_status(current_user: User = Depends(get_current_user)):
    return {
        "complete": bool(current_user.onboarding_complete),
        "has_system_prompt": current_user.system_prompt is not None,
    }
