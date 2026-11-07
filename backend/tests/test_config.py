"""Configuration fails fast when required secrets are missing."""

from __future__ import annotations

import pytest
from app.config import Settings
from pydantic import ValidationError

_REQUIRED = (
    "DATABASE_URL",
    "ANTHROPIC_API_KEY",
    "NUMBER_HMAC_KEY",
    "SESSION_SECRET",
)


def _clear_required(monkeypatch: pytest.MonkeyPatch) -> None:
    # conftest seeds these in os.environ; remove them so "missing" is really missing.
    for name in _REQUIRED:
        monkeypatch.delenv(name, raising=False)


def test_missing_required_secret_raises(monkeypatch):
    _clear_required(monkeypatch)
    with pytest.raises(ValidationError):
        Settings(
            _env_file=None,
            DATABASE_URL="postgresql+asyncpg://x/y",
            ANTHROPIC_API_KEY="k",
            NUMBER_HMAC_KEY="h",
            # SESSION_SECRET intentionally omitted.
        )  # type: ignore[call-arg]


def test_blank_required_secret_raises(monkeypatch):
    _clear_required(monkeypatch)
    with pytest.raises(ValidationError):
        Settings(
            _env_file=None,
            DATABASE_URL="postgresql+asyncpg://x/y",
            ANTHROPIC_API_KEY="k",
            NUMBER_HMAC_KEY="h",
            SESSION_SECRET="   ",
        )  # type: ignore[call-arg]


def test_defaults_applied_for_optional_values(monkeypatch):
    _clear_required(monkeypatch)
    settings = Settings(
        _env_file=None,
        DATABASE_URL="postgresql+asyncpg://x/y",
        ANTHROPIC_API_KEY="k",
        NUMBER_HMAC_KEY="h",
        SESSION_SECRET="s",
    )  # type: ignore[call-arg]
    assert settings.email_driver == "console"
    assert settings.daily_llm_spend_cap_usd == 5.0
    assert settings.cors_origins == ["http://localhost:5173"]
