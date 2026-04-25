from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    anthropic_api_key: str
    database_url: str = "sqlite:///./adeal.db"
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440

    default_agent_model: str = "claude-opus-4-7"
    interviewer_model: str = "claude-opus-4-7"

    market_duration_days: int = 7
    max_negotiation_rounds: int = 10
    scheduler_interval_seconds: int = 30

    class Config:
        env_file = ".env"


settings = Settings()
