"""
LLM provider abstraction — NIMProvider and AnthropicProvider expose the same interface:
  .chat()    — single-turn non-streaming (onboarding interview turns)
  .stream()  — async streaming (real-time interview UI)
  .extract() — non-streaming, higher token budget (JSON profile extraction)
  .decide()  — non-streaming, low token budget (trader action decisions)
"""
from typing import AsyncGenerator


class NIMProvider:
    """
    OpenAI-SDK client pointed at NVIDIA NIM.
    NIM is OpenAI-API-compatible — same message format, same create() call.

    Key differences vs Anthropic:
    - system prompt goes as first message {"role":"system"} not a separate kwarg
    - response text is at choices[0].message.content
    - streaming chunks at choices[0].delta.content (can be None on final chunk)
    """

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
        resp = self._client.chat.completions.create(
            model=self._interview_model,
            max_tokens=max_tokens,
            messages=self._with_system(system, messages),
        )
        return resp.choices[0].message.content

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
        resp = self._client.chat.completions.create(
            model=self._extraction_model,
            max_tokens=max_tokens,
            messages=self._with_system(system, messages),
        )
        return resp.choices[0].message.content

    def decide(self, system: str, messages: list[dict], max_tokens: int = 512) -> str:
        resp = self._client.chat.completions.create(
            model=self._trader_model,
            max_tokens=max_tokens,
            messages=self._with_system(system, messages),
        )
        return resp.choices[0].message.content


class AnthropicProvider:
    """
    Wraps the Anthropic SDK — zero behaviour change from the original code.
    Uses AsyncAnthropic for the streaming path so both providers share the same
    async interface.
    """

    def __init__(self, api_key: str, interview_model: str, trader_model: str):
        import anthropic
        self._client = anthropic.Anthropic(api_key=api_key)
        self._async_client = anthropic.AsyncAnthropic(api_key=api_key)
        self._interview_model = interview_model
        self._trader_model = trader_model

    def chat(self, system: str, messages: list[dict], max_tokens: int = 1024) -> str:
        resp = self._client.messages.create(
            model=self._interview_model,
            max_tokens=max_tokens,
            system=system,
            messages=messages,
        )
        return resp.content[0].text

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
        resp = self._client.messages.create(
            model=self._interview_model,
            max_tokens=max_tokens,
            system=system,
            messages=messages,
        )
        return resp.content[0].text

    def decide(self, system: str, messages: list[dict], max_tokens: int = 512) -> str:
        resp = self._client.messages.create(
            model=self._trader_model,
            max_tokens=max_tokens,
            system=system,
            messages=messages,
        )
        return resp.content[0].text
