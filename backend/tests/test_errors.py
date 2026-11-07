"""Error-envelope and middleware tests."""

from __future__ import annotations

from app.errors import AppError
from fastapi import APIRouter


async def test_unknown_route_returns_envelope(client):
    resp = await client.get("/api/v1/does-not-exist")
    assert resp.status_code == 404
    error = resp.json()["error"]
    assert error["code"] == "not_found"
    assert error["message_key"] == "errors.not_found"
    assert error["request_id"]
    assert error["fields"] == {}


async def test_app_error_envelope_with_retry_after(app, client):
    router = APIRouter()

    @router.get("/api/v1/_boom")
    async def _boom():
        raise AppError("rate_limited", status=429, retry_after=120)

    app.include_router(router)

    resp = await client.get("/api/v1/_boom")
    assert resp.status_code == 429
    assert resp.headers["Retry-After"] == "120"
    error = resp.json()["error"]
    assert error["code"] == "rate_limited"
    assert error["retry_after"] == 120
    assert error["request_id"]


async def test_request_id_is_honoured_when_supplied(client):
    resp = await client.get(
        "/api/v1/health", headers={"X-Request-ID": "fixed-request-id"}
    )
    assert resp.headers["X-Request-ID"] == "fixed-request-id"
