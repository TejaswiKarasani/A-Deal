from app.config import settings
from app.llm.providers import AnthropicProvider, NIMProvider


def _build_provider():
    if settings.llm_provider == "nim":
        if not settings.nvidia_nim_api_key:
            raise RuntimeError("LLM_PROVIDER=nim but NVIDIA_NIM_API_KEY is not set in .env")
        return NIMProvider(
            api_key=settings.nvidia_nim_api_key,
            base_url=settings.nim_base_url,
            interview_model=settings.nim_interview_model,
            extraction_model=settings.nim_extraction_model,
            trader_model=settings.nim_trader_model,
        )
    elif settings.llm_provider == "anthropic":
        if not settings.anthropic_api_key:
            raise RuntimeError("LLM_PROVIDER=anthropic but ANTHROPIC_API_KEY is not set in .env")
        return AnthropicProvider(
            api_key=settings.anthropic_api_key,
            interview_model=settings.interviewer_model,
            trader_model=settings.default_agent_model,
        )
    else:
        raise ValueError(
            f"Unknown LLM_PROVIDER: {settings.llm_provider!r} — use 'nim' or 'anthropic'"
        )


llm = _build_provider()
