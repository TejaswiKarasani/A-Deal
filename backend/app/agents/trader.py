"""
Trading agent — makes decisions on behalf of a user in the marketplace.

Each call to `decide_action` gives the agent the current market context
and asks it to choose an action: post, bid, counter, accept, reject, or pass.
"""
import json
import re

import anthropic

from app.config import settings
from app.agents.prompts import build_trader_system_prompt


client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

# Action types the agent can return
VALID_ACTIONS = {"post", "bid", "counter", "accept", "reject", "pass"}


def decide_action(
    system_prompt: str,
    market_context: str,
    negotiation_history: list[dict] | None = None,
    model: str | None = None,
) -> dict:
    """
    Ask the trading agent to decide its next action.

    Returns a dict like:
    {
        "action": "bid" | "counter" | "accept" | "reject" | "pass" | "post",
        "target_listing_id": int | None,
        "offer_price": float | None,
        "message": str,
    }
    """
    used_model = model or settings.default_agent_model

    context_message = f"""
Current marketplace state:
{market_context}

{f"Negotiation history:{chr(10)}{json.dumps(negotiation_history, indent=2)}" if negotiation_history else ""}

Decide your next action. Respond ONLY with a JSON object in this format:
{{
  "action": "post|bid|counter|accept|reject|pass",
  "target_listing_id": <int or null>,
  "offer_price": <float or null>,
  "message": "<your message to the other party, or your listing text>"
}}
"""

    response = client.messages.create(
        model=used_model,
        max_tokens=512,
        system=system_prompt,
        messages=[{"role": "user", "content": context_message}],
    )

    text = response.content[0].text
    return _parse_action(text)


def _parse_action(text: str) -> dict:
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            action = json.loads(match.group(0))
            if action.get("action") not in VALID_ACTIONS:
                action["action"] = "pass"
            return action
        except json.JSONDecodeError:
            pass

    return {"action": "pass", "target_listing_id": None, "offer_price": None, "message": ""}


def build_system_prompt_for_user(user_profile: dict) -> str:
    return build_trader_system_prompt(user_profile)
