import json
import re
from typing import AsyncGenerator

import anthropic

from app.config import settings
from app.agents.prompts import ONBOARDING_SYSTEM_PROMPT


client = anthropic.Anthropic(api_key=settings.anthropic_api_key)


async def stream_interview_turn(
    conversation_history: list[dict],
    user_message: str,
) -> AsyncGenerator[str, None]:
    """Stream the interviewer's next response given the conversation so far."""
    messages = conversation_history + [{"role": "user", "content": user_message}]

    with client.messages.stream(
        model=settings.interviewer_model,
        max_tokens=1024,
        system=ONBOARDING_SYSTEM_PROMPT,
        messages=messages,
    ) as stream:
        for text in stream.text_stream:
            yield text


def conduct_interview_turn(
    conversation_history: list[dict],
    user_message: str,
) -> str:
    """Non-streaming single turn for the onboarding interview."""
    messages = conversation_history + [{"role": "user", "content": user_message}]

    response = client.messages.create(
        model=settings.interviewer_model,
        max_tokens=1024,
        system=ONBOARDING_SYSTEM_PROMPT,
        messages=messages,
    )
    return response.content[0].text


def extract_profile_from_conversation(conversation_history: list[dict]) -> dict | None:
    """
    Ask the interviewer to extract the structured profile from a completed conversation.
    Returns None if the profile is not yet complete.
    """
    extraction_prompt = (
        "The conversation above is complete. "
        "Extract the user's full profile and output ONLY the JSON block, nothing else."
    )
    messages = conversation_history + [{"role": "user", "content": extraction_prompt}]

    response = client.messages.create(
        model=settings.interviewer_model,
        max_tokens=2048,
        system=ONBOARDING_SYSTEM_PROMPT,
        messages=messages,
    )
    text = response.content[0].text

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
