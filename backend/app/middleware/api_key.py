"""API Key authentication middleware (Doc 02 Section 7, Section 9, F30).

Inspects inbound Authorization (Bearer) and X-API-Key headers for partner API keys.
Verifies the SHA-256 hash against the api_keys table, enforces per-key rate limits,
records last_used_at, and sets request.state.api_key, api_key_id, and api_scopes.
"""

from __future__ import annotations

import hashlib
from typing import Any

from sqlalchemy import select
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.db import get_sessionmaker
from app.errors import envelope_from_parts
from app.models.api_key import ApiKey
from app.models.base import utcnow
from app.services import rate_limit


def hash_key(raw_key: str) -> str:
    """Compute the SHA-256 hex digest of the raw API key."""
    return hashlib.sha256(raw_key.strip().encode("utf-8")).hexdigest()


def extract_api_key(request: Request) -> str | None:
    """Extract raw API key from Authorization or X-API-Key headers."""
    auth_header = request.headers.get("authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.removeprefix("Bearer ").strip()
        if token:
            return token
    x_api_key = request.headers.get("x-api-key")
    if x_api_key and x_api_key.strip():
        return x_api_key.strip()
    return None


class ApiKeyMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        raw_key = extract_api_key(request)
        if not raw_key:
            return await call_next(request)

        # Look up sessionmaker (or dependency override during testing)
        override = getattr(request.app, "dependency_overrides", {}).get("get_db")
        if not override:
            from app.api.deps import get_db

            override = getattr(request.app, "dependency_overrides", {}).get(get_db)

        request_id = getattr(request.state, "request_id", "unknown")

        try:
            if override:
                async for session in override():
                    res = await self._authenticate_key(
                        session, raw_key, request, request_id
                    )
                    if isinstance(res, Response):
                        return res
                    break
            else:
                async with get_sessionmaker()() as session:
                    res = await self._authenticate_key(
                        session, raw_key, request, request_id
                    )
                    if isinstance(res, Response):
                        return res
                    await session.commit()
        except Exception:
            # Let route handler handle or fallback
            pass

        return await call_next(request)

    async def _authenticate_key(
        self,
        session: Any,
        raw_key: str,
        request: Request,
        request_id: str,
    ) -> Response | None:
        key_hash = hash_key(raw_key)
        stmt = select(ApiKey).where(
            ApiKey.key_hash == key_hash,
            ApiKey.revoked_at.is_(None),
        )
        result = await session.execute(stmt)
        key_obj: ApiKey | None = result.scalar_one_or_none()

        if not key_obj:
            return JSONResponse(
                status_code=401,
                content=envelope_from_parts(
                    code="unauthorized",
                    request_id=request_id,
                ),
            )

        # Per-key rate limit check
        rate_res = await rate_limit.hit(
            session,
            f"apikey:{key_obj.id}",
            limit=key_obj.rate_limit_per_min,
            window_seconds=60,
        )
        if not rate_res.allowed:
            headers = {"Retry-After": str(rate_res.retry_after)}
            return JSONResponse(
                status_code=429,
                content=envelope_from_parts(
                    code="rate_limited",
                    request_id=request_id,
                ),
                headers=headers,
            )

        # Update last_used_at
        key_obj.last_used_at = utcnow()
        await session.flush()

        # Set request state
        request.state.api_key = key_obj
        request.state.api_key_id = key_obj.id
        request.state.api_scopes = set(key_obj.scopes or [])
        return None
