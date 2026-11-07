"""Account (/me) and role-guard tests (Phase 04 acceptance)."""

from __future__ import annotations

from datetime import UTC, datetime

from app.api.deps import require_role
from app.models.user import User
from app.security.passwords import hash_password
from fastapi import Depends

from tests.helpers import login, register_verified


async def test_me_requires_authentication(client):
    assert (await client.get("/api/v1/me")).status_code == 401


async def test_read_and_update_profile(client):
    await register_verified(client, email="prof@example.com")
    await login(client, "prof@example.com", "correct-horse-battery")

    me = await client.get("/api/v1/me")
    assert me.status_code == 200
    assert me.json()["onboarding_completed"] is False

    patched = await client.patch(
        "/api/v1/me",
        json={"name": "New Name", "language": "en", "onboarding_completed": True},
    )
    assert patched.status_code == 200
    body = patched.json()
    assert body["display_name"] == "New Name"
    assert body["language"] == "en"
    assert body["onboarding_completed"] is True


async def test_change_password(client):
    await register_verified(client, email="chg@example.com")
    await login(client, "chg@example.com", "correct-horse-battery")

    wrong = await client.post(
        "/api/v1/me/password",
        json={"current": "not-the-password", "new": "another-strong-pw"},
    )
    assert wrong.status_code == 401

    ok = await client.post(
        "/api/v1/me/password",
        json={"current": "correct-horse-battery", "new": "another-strong-pw"},
    )
    assert ok.status_code == 204
    # Old password no longer works; new one does.
    await client.post("/api/v1/auth/logout")
    assert (
        await login(client, "chg@example.com", "correct-horse-battery")
    ).status_code == 401
    assert (
        await login(client, "chg@example.com", "another-strong-pw")
    ).status_code == 200


async def test_sessions_list_marks_current(client):
    await register_verified(client, email="sess@example.com")
    await login(client, "sess@example.com", "correct-horse-battery")
    resp = await client.get("/api/v1/me/sessions")
    assert resp.status_code == 200
    sessions = resp.json()
    assert len(sessions) == 1
    assert sessions[0]["current"] is True


async def test_export_returns_profile_json(client):
    await register_verified(client, email="exp@example.com")
    await login(client, "exp@example.com", "correct-horse-battery")
    resp = await client.get("/api/v1/me/export")
    assert resp.status_code == 200
    assert "attachment" in resp.headers.get("content-disposition", "")
    data = resp.json()
    assert data["profile"]["email"] == "exp@example.com"
    assert "sessions" in data


async def test_delete_account_requires_exact_confirmation(client):
    await register_verified(client, email="del@example.com")
    await login(client, "del@example.com", "correct-horse-battery")

    bad = await client.request(
        "DELETE", "/api/v1/me", json={"confirm": "delete"}
    )
    assert bad.status_code == 422

    ok = await client.request("DELETE", "/api/v1/me", json={"confirm": "DELETE"})
    assert ok.status_code == 204
    # Account gone: the session no longer resolves.
    assert (await client.get("/api/v1/me")).status_code == 401


async def test_user_cannot_reach_a_reviewer_route(app, client, db):
    # Mount a reviewer-only probe route on the live app.
    @app.get("/api/v1/_reviewer_probe")
    async def _probe(_: User = Depends(require_role("reviewer"))) -> dict[str, bool]:
        return {"ok": True}

    # A normal verified user is forbidden (403, not 404 — role gate).
    await register_verified(client, email="plainuser@example.com")
    await login(client, "plainuser@example.com", "correct-horse-battery")
    forbidden = await client.get("/api/v1/_reviewer_probe")
    assert forbidden.status_code == 403
    assert forbidden.json()["error"]["code"] == "forbidden"

    # A reviewer gets through.
    db.add(
        User(
            email="reviewer2@example.com",
            password_hash=hash_password("reviewer-strong-pw"),
            display_name="Reviewer Two",
            role="reviewer",
            email_verified_at=datetime.now(UTC),
        )
    )
    await db.commit()
    await client.post("/api/v1/auth/logout")
    await login(client, "reviewer2@example.com", "reviewer-strong-pw")
    allowed = await client.get("/api/v1/_reviewer_probe")
    assert allowed.status_code == 200
