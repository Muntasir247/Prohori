"""Shared request dependencies (Doc 02 Section 7).

Every non-public route declares one of these. They provide the transactional DB
session, CSRF enforcement on state changes, the current user, role/scope guards,
and the guest identity.
"""

from __future__ import annotations

from collections.abc import AsyncIterator, Callable
from typing import Annotated

from fastapi import Depends, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.cookies import (
    guest_cookie_name,
    session_cookie_name,
    set_guest_cookie,
    set_session_cookie,
)
from app.config import get_settings
from app.db import get_sessionmaker
from app.errors import AppError
from app.models.user import User
from app.security.tokens import hash_token, new_token
from app.services import auth as auth_service

_STATE_CHANGING = {"POST", "PUT", "PATCH", "DELETE"}


async def get_db() -> AsyncIterator[AsyncSession]:
    """Yield a session and commit it when the request succeeds (unit of work)."""
    async with get_sessionmaker()() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


DbSession = Annotated[AsyncSession, Depends(get_db)]


async def enforce_csrf(request: Request) -> None:
    """Reject cross-site state changes (Doc 02 Section 7).

    Requires the ``X-Requested-With`` header (cannot be forged by a cross-site
    HTML form without a CORS preflight) and, when an ``Origin`` is present, that
    it exactly matches an allowed origin.
    """
    if request.method not in _STATE_CHANGING:
        return
    if not request.headers.get("x-requested-with"):
        raise AppError("csrf_failed", status=403, message_key="errors.csrf_failed")
    origin = request.headers.get("origin")
    if origin and origin not in get_settings().cors_origins:
        raise AppError("csrf_failed", status=403, message_key="errors.csrf_failed")


async def get_optional_user(
    request: Request, response: Response, session: DbSession
) -> User | None:
    token = request.cookies.get(session_cookie_name())
    if not token:
        return None
    resolved = await auth_service.resolve_session(session, token)
    if not resolved:
        return None
    user = resolved[0]
    # Rolling lifetime (Doc 02 Section 7): the DB expiry moved forward in
    # resolve_session, so move the cookie's max-age forward with it.
    set_session_cookie(response, token, max_age=auth_service.session_max_age(user.role))
    return user


async def get_current_user(
    user: Annotated[User | None, Depends(get_optional_user)],
) -> User:
    if user is None:
        raise AppError("unauthorized", status=401, message_key="errors.unauthorized")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_role(*roles: str) -> Callable[[User], User]:
    """Dependency factory: allow only users holding one of ``roles``.

    Returns 403 ``forbidden`` (not 404) because the resource is role-gated, not
    object-owned — IDOR hiding (R02) applies to owned objects, handled elsewhere.
    """

    allowed = set(roles)

    async def _guard(user: CurrentUser) -> User:
        if user.role not in allowed:
            raise AppError("forbidden", status=403, message_key="errors.forbidden")
        return user

    return _guard


def require_scope(*scopes: str) -> Callable[[Request], None]:
    """Dependency factory for API-key scopes (keys arrive in Phase 11).

    Defined here so routes can declare the guard now; it currently rejects every
    request that reaches it without a scoped key.
    """

    async def _guard(request: Request) -> None:
        granted = getattr(request.state, "api_scopes", None) or set()
        if not set(scopes).issubset(granted):
            raise AppError("forbidden", status=403, message_key="errors.forbidden")

    return _guard


async def get_guest_hash(request: Request, response: Response) -> str:
    """Return the SHA-256 of the guest cookie, minting one if absent.

    Only the hash is ever stored (Doc 02 Section 7); the raw value stays in the
    visitor's cookie.
    """
    token = request.cookies.get(guest_cookie_name())
    if not token:
        token = new_token()
        set_guest_cookie(response, token)
    return hash_token(token)


# Alias for compatibility with the spec naming
guest_id = get_guest_hash
GuestId = Annotated[str, Depends(guest_id)]
