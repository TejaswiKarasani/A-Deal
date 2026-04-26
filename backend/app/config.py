from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Provider: "nim" (default, free) or "anthropic"
    llm_provider: str = "nim"

    # API keys
    anthropic_api_key: str = ""   # only needed if llm_provider=anthropic
    nvidia_nim_api_key: str = ""  # only needed if llm_provider=nim

    database_url: str = "sqlite:///./adeal.db"
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440

    # Anthropic model config (used when llm_provider=anthropic)
    default_agent_model: str = "claude-opus-4-7"
    interviewer_model: str = "claude-opus-4-7"

    # NIM model config (used when llm_provider=nim)
    nim_base_url: str = "https://integrate.api.nvidia.com/v1"
    nim_interview_model: str = "meta/llama-3.3-70b-instruct"   # warm conversational chat
    nim_extraction_model: str = "deepseek-ai/deepseek-r1-0528" # precise JSON extraction
    nim_trader_model: str = "deepseek-ai/deepseek-r1-0528"     # strategic reasoning + JSON

    # Market config
    market_duration_days: int = 7
    max_negotiation_rounds: int = 10
    scheduler_interval_seconds: int = 30

    class Config:
        env_file = ".env"


settings = Settings()
