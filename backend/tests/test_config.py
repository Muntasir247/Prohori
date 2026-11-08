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
    assert settings.trust_proxy_headers is False


_BASE = {
    "_env_file": None,
    "DATABASE_URL": "postgresql+asyncpg://x/y",
    "ANTHROPIC_API_KEY": "k",
    "NUMBER_HMAC_KEY": "h",
    "SESSION_SECRET": "s",
}


@pytest.mark.parametrize(
    "email",
    [
        {},  # console driver
        {"EMAIL_DRIVER": "resend"},  # resend without a key
    ],
)
def test_production_refuses_to_start_without_real_email(monkeypatch, email):
    _clear_required(monkeypatch)
    monkeypatch.delenv("ENVIRONMENT", raising=False)
    with pytest.raises(ValidationError, match="EMAIL_DRIVER=resend"):
        Settings(**_BASE, ENVIRONMENT="production", **email)  # type: ignore[arg-type]


def test_production_with_resend_starts_with_secure_cookies(monkeypatch):
    _clear_required(monkeypatch)
    monkeypatch.delenv("ENVIRONMENT", raising=False)
    settings = Settings(
        **_BASE,
        ENVIRONMENT="production",
        EMAIL_DRIVER="resend",
        RESEND_API_KEY="re_x",
    )  # type: ignore[arg-type]
    assert settings.cookie_secure is True


def test_cors_exact_origin_validation(monkeypatch):
    _clear_required(monkeypatch)
    # Valid extra origins
    s1 = Settings(
        **_BASE,
        CORS_ORIGINS="https://app.prohori.com, https://admin.prohori.com",
    )  # type: ignore[arg-type]
    assert "https://app.prohori.com" in s1.cors_origins
    assert "https://admin.prohori.com" in s1.cors_origins
    assert "*" not in s1.cors_origins

    # Wildcard is strictly forbidden
    s_wildcard = Settings(**_BASE, CORS_ORIGINS="*")  # type: ignore[arg-type]
    with pytest.raises(ValueError, match="wildcard"):
        _ = s_wildcard.cors_origins

    # Origin without scheme is forbidden
    s_invalid = Settings(**_BASE, CORS_ORIGINS="evil.com")  # type: ignore[arg-type]
    with pytest.raises(ValueError, match="Must start with http"):
        _ = s_invalid.cors_origins
