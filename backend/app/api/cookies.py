"""Session and guest cookie helpers (Doc 02 Section 7).

The session cookie is ``__Host-prohori_session`` — HttpOnly, Secure, SameSite=Lax,
Path=/, no Domain. The ``__Host-`` prefix requires Secure, which cannot be set on
plain-HTTP local development, so the prefix is dropped (and Secure omitted) only
when ``settings.cookie_secure`` is false. Production is always the full spec.
"""

from __future__ import annotations

from fastapi import Response

from app.config import get_settings

_SESSION_BASE = "prohori_session"
_GUEST_BASE = "prohori_guest"


def _name(base: str) -> str:
    return f"__Host-{base}" if get_settings().cookie_secure else base


def session_cookie_name() -> str:
    return _name(_SESSION_BASE)


def guest_cookie_name() -> str:
    return _name(_GUEST_BASE)


def set_session_cookie(response: Response, token: str, *, max_age: int) -> None:
    settings = get_settings()
    response.set_cookie(
        key=session_cookie_name(),
        value=token,
        max_age=max_age,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(
        key=session_cookie_name(),
        httponly=True,
        secure=get_settings().cookie_secure,
        samesite="lax",
        path="/",
    )


def set_guest_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=guest_cookie_name(),
        value=token,
        max_age=180 * 24 * 3600,
        httponly=True,
        secure=get_settings().cookie_secure,
        samesite="lax",
        path="/",
    )
