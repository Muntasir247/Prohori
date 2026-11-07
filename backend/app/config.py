"""Application configuration.

Settings are loaded from environment variables (and an optional local ``.env``
file) by ``pydantic-settings``. Required secrets have no default, so the process
fails fast at startup if any are missing — see ``docs/PROHORI_DOC02.md`` Section 7.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Validated runtime configuration for the Prohori backend."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # --- Required (no default: startup fails if unset) ---------------------
    # Async SQLAlchemy URL, e.g. postgresql+asyncpg://user:pass@host:5432/prohori
    database_url: str = Field(..., alias="DATABASE_URL")
    # Claude API key for Haiku/Sonnet calls.
    anthropic_api_key: str = Field(..., alias="ANTHROPIC_API_KEY")
    # Key used to HMAC phone numbers before storage. Rotating it orphans hashes.
    number_hmac_key: str = Field(..., alias="NUMBER_HMAC_KEY")
    # Secret used to sign/seal session and guest cookies.
    session_secret: str = Field(..., alias="SESSION_SECRET")

    # --- Optional (safe defaults) -----------------------------------------
    voyage_api_key: str | None = Field(default=None, alias="VOYAGE_API_KEY")
    resend_api_key: str | None = Field(default=None, alias="RESEND_API_KEY")
    email_driver: Literal["console", "resend"] = Field(
        default="console", alias="EMAIL_DRIVER"
    )
    app_origin: str = Field(default="http://localhost:5173", alias="APP_ORIGIN")
    sentry_dsn: str | None = Field(default=None, alias="SENTRY_DSN")
    daily_llm_spend_cap_usd: float = Field(
        default=5.0, alias="DAILY_LLM_SPEND_CAP_USD", ge=0
    )

    # --- Operational ------------------------------------------------------
    environment: Literal["development", "test", "production"] = Field(
        default="development", alias="ENVIRONMENT"
    )
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")

    @field_validator("database_url", "anthropic_api_key", "number_hmac_key",
                     "session_secret")
    @classmethod
    def _not_blank(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("must not be empty")
        return value

    @property
    def cors_origins(self) -> list[str]:
        """Exact allowed origins for CORS (never a wildcard)."""
        return [self.app_origin]

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def cookie_secure(self) -> bool:
        """Cookies are Secure everywhere except local development and tests.

        The ``__Host-`` cookie prefix requires Secure in real browsers, so this is
        only relaxed off-HTTPS local dev.
        """
        return self.environment not in ("development", "test")


@lru_cache
def get_settings() -> Settings:
    """Return the cached settings instance (constructed once per process)."""
    return Settings()  # type: ignore[call-arg]
