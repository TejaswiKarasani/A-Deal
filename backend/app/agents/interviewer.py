import json
import re
from typing import AsyncGenerator

from app.llm import llm
from app.agents.prompts import ONBOARDING_SYSTEM_PROMPT


async def stream_interview_turn(
    conversation_history: list[dict],
    user_message: str,
) -> AsyncGenerator[str, None]:
    """Stream the interviewer's next response given the conversation so far."""
    messages = conversation_history + [{"role": "user", "content": user_message}]
    async for chunk in llm.stream(ONBOARDING_SYSTEM_PROMPT, messages, max_tokens=1024):
        yield chunk


def conduct_interview_turn(
    conversation_history: list[dict],
    user_message: str,
) -> str:
    """Non-streaming single turn for the onboarding interview."""
    messages = conversation_history + [{"role": "user", "content": user_message}]
    return llm.chat(ONBOARDING_SYSTEM_PROMPT, messages, max_tokens=1024)


def extract_profile_from_conversation(conversation_history: list[dict]) -> dict | None:
    """
    Ask the model to extract the structured profile from a completed conversation.
    Returns None if the profile is not yet complete.
    """
    extraction_prompt = (
        "The conversation above is complete. "
        "Extract the user's full profile and output ONLY the JSON block, nothing else."
    )
    messages = conversation_history + [{"role": "user", "content": extraction_prompt}]
    text = llm.extract(ONBOARDING_SYSTEM_PROMPT, messages, max_tokens=2048)

    match = re.search(r"```json\s*(.*?)\s*```", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            return None

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return None
