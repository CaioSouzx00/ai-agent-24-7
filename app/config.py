"""Central configuration via environment variables."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "dev"
    llm_provider: str = "nim"
    nim_base_url: str = "http://localhost:8000/v1"
    nim_model: str = "meta/llama-3.1-8b-instruct"
    nim_embed_model: str = "nvidia/nv-embedqa-e5-v5"
    nim_api_key: str = "not-needed-locally"
    redis_url: str = "redis://localhost:6379/0"
    database_url: str = "postgresql://agent:agent@localhost:5432/agent"
    slack_bot_token: str = ""
    slack_signing_secret: str = ""
    slack_handoff_webhook: str = ""  # Slack or Teams incoming-webhook URL for handoff alerts
    public_url: str = ""  # public base URL, used in handoff alert links
    github_token: str = ""
    whatsapp_verify_token: str = ""
    whatsapp_app_secret: str = ""
    api_keys: str = ""  # comma-separated keys accepted by /chat and /ws; empty = open in dev only
    whatsapp_token: str = ""
    sentry_dsn: str = ""
    temporal_address: str = "localhost:7233"
    jwt_secret: str = ""  # Secret for HS256 JWT tokens
    jwt_jwks_url: str = ""  # JWKS URL for Clerk / Auth0 RS256 validation
    jwt_audience: str = ""  # Optional JWT audience verification
    jwt_issuer: str = ""  # Optional JWT issuer verification
    google_access_token: str = ""  # Direct Google OAuth access token
    google_service_account_file: str = ""  # Path to service account JSON
    google_oauth_credentials_file: str = ""  # Path to OAuth client token JSON
    vision_model: str = ""  # Specific multimodal vision model (defaults to nim_model)


@lru_cache
def get_settings() -> Settings:
    return Settings()
