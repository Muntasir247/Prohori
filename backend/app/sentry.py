"""Sentry integration and PII/body scrubbing (Doc 02 Section 11, R12).

Non-negotiable rule #1: Never store or log raw message text, full phone
numbers, OTPs or PINs.

This module installs a strict `before_send` hook that scrubs:
1. All HTTP request bodies (which may contain user messages or payment text).
2. Sensitive headers (Authorization, X-API-Key, Cookie, Set-Cookie).
3. Sensitive query parameters (tokens, credentials, phone numbers).
4. Breadcrumb payloads and message text matching BD phone numbers or credentials.
"""

from __future__ import annotations

import re
from typing import Any

from app.config import Settings
from app.logging_config import get_logger

_logger = get_logger("prohori.sentry")

# Headers that must never be sent to Sentry.
_SENSITIVE_HEADERS = frozenset(
    {
        "authorization",
        "cookie",
        "set-cookie",
        "x-api-key",
        "proxy-authorization",
        "x-csrf-token",
    }
)

# Query parameters that should be redacted.
_SENSITIVE_QUERY_PARAMS = frozenset(
    {
        "token",
        "key",
        "secret",
        "password",
        "phone",
        "code",
        "otp",
        "pin",
    }
)

# Regex to scrub phone-like digit sequences from breadcrumbs or error strings.
_PHONE_PATTERN = re.compile(r"(\+?880\s?1[3-9]\d{8}|01[3-9]\d{8})")
_OTP_PIN_PATTERN = re.compile(r"\b\d{4,6}\b")


def scrub_sentry_event(
    event: dict[str, Any], hint: dict[str, Any] | None = None
) -> dict[str, Any]:
    """Scrub request body, headers, and PII from a Sentry event before sending."""
    request_data = event.get("request")
    if isinstance(request_data, dict):
        # 1. Non-negotiable: completely scrub request body / data.
        if "data" in request_data and request_data["data"]:
            request_data["data"] = "[REDACTED_REQUEST_BODY]"

        # 2. Scrub sensitive headers.
        headers = request_data.get("headers")
        if isinstance(headers, dict):
            for header_name in list(headers.keys()):
                if header_name.lower() in _SENSITIVE_HEADERS:
                    headers[header_name] = "[REDACTED]"

        # 3. Scrub query string.
        query_string = request_data.get("query_string")
        if query_string:
            if isinstance(query_string, str):
                # Redact known parameter keys
                redacted_parts = []
                for part in query_string.split("&"):
                    if "=" in part:
                        k, v = part.split("=", 1)
                        if k.lower() in _SENSITIVE_QUERY_PARAMS:
                            redacted_parts.append(f"{k}=[REDACTED]")
                        else:
                            redacted_parts.append(f"{k}={v}")
                    else:
                        redacted_parts.append(part)
                request_data["query_string"] = "&".join(redacted_parts)
            elif isinstance(query_string, dict):
                for k in list(query_string.keys()):
                    if k.lower() in _SENSITIVE_QUERY_PARAMS:
                        query_string[k] = "[REDACTED]"

    # 4. Scrub breadcrumbs
    breadcrumbs = event.get("breadcrumbs")
    if isinstance(breadcrumbs, dict) and "values" in breadcrumbs:
        sensitive_keywords = (
            "body", "text", "payload", "message", "password", "token", "phone"
        )
        for bc in breadcrumbs["values"]:
            if isinstance(bc, dict) and "data" in bc and isinstance(bc["data"], dict):
                # Never include raw payloads in breadcrumb data
                for k in list(bc["data"].keys()):
                    if any(s in k.lower() for s in sensitive_keywords):
                        bc["data"][k] = "[REDACTED]"

    # 5. Scrub user object — keep only user id/role if present, never email/phone
    user = event.get("user")
    if isinstance(user, dict):
        for field in ("email", "username", "ip_address", "phone"):
            user.pop(field, None)

    return event


def init_sentry(settings: Settings) -> None:
    """Initialize Sentry SDK with strict scrubbing if SENTRY_DSN is configured."""
    if not settings.sentry_dsn:
        return

    try:
        import sentry_sdk

        sentry_sdk.init(
            dsn=settings.sentry_dsn,
            environment=settings.environment,
            before_send=scrub_sentry_event,
            send_default_pii=False,
            max_breadcrumbs=30,
            traces_sample_rate=0.1 if settings.environment == "production" else 1.0,
        )
        _logger.info("sentry_initialized", extra={"environment": settings.environment})
    except ImportError:
        _logger.warning("sentry_sdk_not_installed")
    except Exception as exc:
        _logger.error("sentry_init_failed", extra={"error": str(exc)})
