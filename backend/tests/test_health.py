"""Health endpoint tests (SQLite stands in for Postgres)."""

from __future__ import annotations


async def test_health_ok_when_db_reachable(client):
    resp = await client.get("/api/v1/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert body["database"] == "up"
    assert "version" in body
    # Request id middleware echoes the header on every response.
    assert resp.headers.get("X-Request-ID")


async def test_health_degraded_when_db_down(client, monkeypatch):
    async def _boom() -> bool:
        raise RuntimeError("db unreachable")

    monkeypatch.setattr("app.api.v1.health.ping", _boom)
    resp = await client.get("/api/v1/health")
    assert resp.status_code == 503
    body = resp.json()
    assert body["status"] == "degraded"
    assert body["database"] == "down"
