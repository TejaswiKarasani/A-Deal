"""
LLM provider abstraction — NIMProvider and AnthropicProvider expose the same interface:
  .chat()    — single-turn non-streaming (onboarding interview turns)
  .stream()  — async streaming (real-time interview UI)
  .extract() — non-streaming, higher token budget (JSON profile extraction)
  .decide()  — non-streaming, low token budget (trader action decisions)

Both providers include exponential-backoff retry on rate-limit / server errors.
"""
import logging
import time
from typing import AsyncGenerator

logger = logging.getLogger(__name__)

_RETRYABLE_STATUS = {429, 500, 502, 503, 504}
_MAX_RETRIES = 3
_BACKOFF_BASE = 2  # seconds — doubles each attempt: 2s, 4s, 8s


def _retry_sync(fn, label: str):
    """Call fn() up to _MAX_RETRIES times with exponential backoff on retryable errors."""
    for attempt in range(1, _MAX_RETRIES + 1):
        try:
            return fn()
        except Exception as exc:
            status = getattr(getattr(exc, "response", None), "status_code", None)
            if status not in _RETRYABLE_STATUS and attempt == _MAX_RETRIES:
                raise
            if status not in _RETRYABLE_STATUS:
                raise
            wait = _BACKOFF_BASE ** attempt
            logger.warning(
                "llm_retry label=%s attempt=%s/%s status=%s wait=%ss error=%s",
                label, attempt, _MAX_RETRIES, status, wait, exc,
            )
            time.sleep(wait)
    raise RuntimeError(f"All {_MAX_RETRIES} retries failed for {label}")


class NIMProvider:
    """OpenAI-SDK client pointed at NVIDIA NIM (OpenAI-API-compatible)."""

    def __init__(
        self,
        api_key: str,
        base_url: str,
        interview_model: str,
        extraction_model: str,
        trader_model: str,
    ):
        from openai import OpenAI, AsyncOpenAI
        self._client = OpenAI(api_key=api_key, base_url=base_url)
        self._async_client = AsyncOpenAI(api_key=api_key, base_url=base_url)
        self._interview_model = interview_model
        self._extraction_model = extraction_model
        self._trader_model = trader_model

    def _with_system(self, system: str, messages: list[dict]) -> list[dict]:
        return [{"role": "system", "content": system}] + messages

    def chat(self, system: str, messages: list[dict], max_tokens: int = 1024) -> str:
        return _retry_sync(
            lambda: self._client.chat.completions.create(
                model=self._interview_model,
                max_tokens=max_tokens,
                messages=self._with_system(system, messages),
            ).choices[0].message.content,
            label="nim.chat",
        )

    async def stream(
        self, system: str, messages: list[dict], max_tokens: int = 1024
    ) -> AsyncGenerator[str, None]:
        stream = await self._async_client.chat.completions.create(
            model=self._interview_model,
            max_tokens=max_tokens,
            messages=self._with_system(system, messages),
            stream=True,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta

    def extract(self, system: str, messages: list[dict], max_tokens: int = 2048) -> str:
        return _retry_sync(
            lambda: self._client.chat.completions.create(
                model=self._extraction_model,
                max_tokens=max_tokens,
                messages=self._with_system(system, messages),
            ).choices[0].message.content,
            label="nim.extract",
        )

    def decide(self, system: str, messages: list[dict], max_tokens: int = 512) -> str:
        return _retry_sync(
            lambda: self._client.chat.completions.create(
                model=self._trader_model,
                max_tokens=max_tokens,
                messages=self._with_system(system, messages),
            ).choices[0].message.content,
            label="nim.decide",
        )


class AnthropicProvider:
    """Wraps the Anthropic SDK with the same interface as NIMProvider."""

    def __init__(self, api_key: str, interview_model: str, trader_model: str):
        import anthropic
        self._client = anthropic.Anthropic(api_key=api_key)
        self._async_client = anthropic.AsyncAnthropic(api_key=api_key)
        self._interview_model = interview_model
        self._trader_model = trader_model

    def chat(self, system: str, messages: list[dict], max_tokens: int = 1024) -> str:
        return _retry_sync(
            lambda: self._client.messages.create(
                model=self._interview_model,
                max_tokens=max_tokens,
                system=system,
                messages=messages,
            ).content[0].text,
            label="anthropic.chat",
        )

    async def stream(
        self, system: str, messages: list[dict], max_tokens: int = 1024
    ) -> AsyncGenerator[str, None]:
        async with self._async_client.messages.stream(
            model=self._interview_model,
            max_tokens=max_tokens,
            system=system,
            messages=messages,
        ) as s:
            async for text in s.text_stream:
                yield text

    def extract(self, system: str, messages: list[dict], max_tokens: int = 2048) -> str:
        return _retry_sync(
            lambda: self._client.messages.create(
                model=self._interview_model,
                max_tokens=max_tokens,
                system=system,
                messages=messages,
            ).content[0].text,
            label="anthropic.extract",
        )

    def decide(self, system: str, messages: list[dict], max_tokens: int = 512) -> str:
        return _retry_sync(
            lambda: self._client.messages.create(
                model=self._trader_model,
                max_tokens=max_tokens,
                system=system,
                messages=messages,
            ).content[0].text,
            label="anthropic.decide",
        )
