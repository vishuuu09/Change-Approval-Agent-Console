import os


class Settings:
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./dev.db")
    jwt_secret: str = os.getenv("JWT_SECRET", "dev-only-change-me")
    jwt_minutes: int = int(os.getenv("JWT_MINUTES", "60"))
    demo_password: str = os.getenv("DEMO_PASSWORD", "change-me-demo")
    anthropic_api_key: str = os.getenv("ANTHROPIC_API_KEY", "")
    agent_model: str = os.getenv("AGENT_MODEL", "claude-sonnet-5-5")
    agent_timeout_s: float = float(os.getenv("AGENT_TIMEOUT_S", "20"))


settings = Settings()
