"""Security-focused auth tests (Doc 02 Sections 7 & 11, Phase 04 acceptance).

Complements ``test_auth.py`` with the properties the phase must prove beyond the
happy paths: the lock really lasts 15 minutes, per-IP locking cannot be dodged
by spoofing X-Forwarded-For, every one-time token type fails when expired or
reused, a reset logs out *other* devices, CSRF guards cover /me, cookies carry
the right attributes, the guest identity stores only a hash, staff idle timeout,
and nothing but SHA-256 hashes of tokens reaches the database.
"""

from __future__ import annotations

import hashlib
from datetime import UTC, datetime, timedelta

import httpx
import pytest
from app.api.cookies import session_cookie_name, set_session_cookie
from app.api.deps import get_guest_hash, require_role
from app.models.audit import AuditEvent
from app.models.auth_token import AuthToken
from app.models.rate_limit import RateLimitCounter
from app.models.session import Session
from app.models.user import User
from app.security.passwords import hash_password
from app.services.email import get_outbox
from fastapi import Depends, Response
from sqlalchemy import select, update

from tests.helpers import latest_token, login, register, register_verified

PW = "correct-horse-battery"


def _sha(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


async def _shift_locks(db, minutes: int) -> None:
    """Pretend ``minutes`` have passed since every active lock started."""
    rows = (
        (
            await db.execute(
                select(RateLimitCounter).where(RateLimitCounter.key.like("lock:%"))
            )
        )
        .scalars()
        .all()
    )
    assert rows, "expected an active lock row"
    for row in rows:
        await db.execute(
            update(RateLimitCounter)
            .where(
                RateLimitCounter.key == row.key,
                RateLimitCounter.window_start == row.window_start,
            )
            .values(window_start=row.window_start - timedelta(minutes=minutes))
        )
    await db.commit()


async def _add_staff(db, email: str, role: str) -> None:
    db.add(
        User(
            email=email,
            password_hash=hash_password("staff-strong-password"),
            display_name="Staff Member",
            role=role,
            email_verified_at=datetime.now(UTC),
        )
    )
    await db.commit()


# --- Lockout ---------------------------------------------------------------
async def test_lock_lasts_the_full_15_minutes_then_lifts(client, db):
    await register_verified(client, email="lock15@example.com")
    for _ in range(5):
        assert (
            await login(client, "lock15@example.com", "wrong-pass-123")
        ).status_code == 401

    locked = await login(client, "lock15@example.com", PW)
    assert locked.status_code == 429
    assert locked.json()["error"]["message_key"] == "errors.login_locked"
    # A fresh lock has (almost) the whole 15 minutes left — not "until the end of
    # the current fixed window".
    assert 15 * 60 - 5 <= int(locked.headers["Retry-After"]) <= 15 * 60

    await _shift_locks(db, 14)
    still = await login(client, "lock15@example.com", PW)
    assert still.status_code == 429
    assert int(still.headers["Retry-After"]) <= 60

    await _shift_locks(db, 2)  # 16 minutes in total
    assert (await login(client, "lock15@example.com", PW)).status_code == 200


async def test_lock_is_audited_without_the_email(client, db):
    await register_verified(client, email="audit-lock@example.com")
    for _ in range(5):
        await login(client, "audit-lock@example.com", "wrong-pass-123")
    events = (
        (
            await db.execute(
                select(AuditEvent).where(AuditEvent.action == "login_locked")
            )
        )
        .scalars()
        .all()
    )
    assert {e.entity_type for e in events} == {"login_email", "login_ip"}
    for e in events:
        assert "audit-lock@example.com" not in e.entity_id
        assert "@" not in e.entity_id


async def test_failures_per_ip_lock_across_emails_and_xff_cannot_dodge_it(client):
    await register_verified(client, email="victim@example.com")
    for i in range(5):
        r = await client.post(
            "/api/v1/auth/login",
            json={"email": f"guess{i}@example.com", "password": "wrong-pass-123"},
            # A spoofed header must not give each attempt a fresh "IP".
            headers={"X-Forwarded-For": f"203.0.113.{i}"},
        )
        assert r.status_code == 401
    blocked = await client.post(
        "/api/v1/auth/login",
        json={"email": "victim@example.com", "password": PW},
        headers={"X-Forwarded-For": "198.51.100.77"},
    )
    assert blocked.status_code == 429


async def test_successful_login_resets_the_failure_count(client):
    await register_verified(client, email="reset-count@example.com")
    for _ in range(4):
        await login(client, "reset-count@example.com", "wrong-pass-123")
    assert (await login(client, "reset-count@example.com", PW)).status_code == 200
    for _ in range(4):
        assert (
            await login(client, "reset-count@example.com", "wrong-pass-123")
        ).status_code == 401
    assert (await login(client, "reset-count@example.com", PW)).status_code == 200


# --- Account discovery -----------------------------------------------------
async def test_forgot_password_is_identical_for_unknown_email(client):
    await register_verified(client, email="known@example.com")
    get_outbox().clear()
    known = await client.post(
        "/api/v1/auth/forgot-password", json={"email": "known@example.com"}
    )
    unknown = await client.post(
        "/api/v1/auth/forgot-password", json={"email": "ghost@example.com"}
    )
    assert known.status_code == unknown.status_code == 202
    assert known.json() == unknown.json()
    # Only the real account received mail.
    assert [m.to for m in get_outbox()] == ["known@example.com"]


async def test_register_over_a_verified_account_is_indistinguishable(client):
    await register_verified(client, email="taken@example.com")
    fresh = await register(client, email="brand-new@example.com")
    again = await register(
        client, email="taken@example.com", password="another-pass-99"
    )
    assert fresh.status_code == again.status_code == 202
    assert fresh.json() == again.json()
    # The original password still works: re-registering never overwrites it.
    assert (await login(client, "taken@example.com", PW)).status_code == 200


# --- One-time tokens -------------------------------------------------------
async def _expire(db, purpose: str) -> None:
    await db.execute(
        update(AuthToken)
        .where(AuthToken.purpose == purpose)
        .values(expires_at=datetime.now(UTC) - timedelta(seconds=1))
    )
    await db.commit()


async def test_expired_reset_token_fails(client, db):
    await register_verified(client, email="exp-reset@example.com")
    await client.post(
        "/api/v1/auth/forgot-password", json={"email": "exp-reset@example.com"}
    )
    token = latest_token("reset_password")
    await _expire(db, "reset_password")
    resp = await client.post(
        "/api/v1/auth/reset-password",
        json={"token": token, "password": "a-brand-new-passphrase"},
    )
    assert resp.status_code == 410
    assert resp.json()["error"]["code"] == "token_invalid"
    # The old password is untouched.
    assert (await login(client, "exp-reset@example.com", PW)).status_code == 200


async def test_reused_reset_token_fails(client):
    await register_verified(client, email="reuse-reset@example.com")
    await client.post(
        "/api/v1/auth/forgot-password", json={"email": "reuse-reset@example.com"}
    )
    token = latest_token("reset_password")
    body = {"token": token, "password": "a-brand-new-passphrase"}
    assert (
        await client.post("/api/v1/auth/reset-password", json=body)
    ).status_code == 204
    second = await client.post(
        "/api/v1/auth/reset-password",
        json={"token": token, "password": "attacker-chosen-pass"},
    )
    assert second.status_code == 410


async def test_expired_and_reused_invite_tokens_fail(client, db):
    from app.services import auth as auth_service
    from app.services.email import EmailService

    expired = await auth_service.create_invite(
        db, email="late@example.com", role="reviewer", email_service=EmailService()
    )
    await db.commit()
    await _expire(db, "invite")
    body = {"token": expired, "name": "Late Reviewer", "password": "reviewer-strong-pw"}
    assert (
        await client.post("/api/v1/auth/accept-invite", json=body)
    ).status_code == 410

    fresh = await auth_service.create_invite(
        db, email="once@example.com", role="reviewer", email_service=EmailService()
    )
    await db.commit()
    body = {"token": fresh, "name": "Once Reviewer", "password": "reviewer-strong-pw"}
    assert (
        await client.post("/api/v1/auth/accept-invite", json=body)
    ).status_code == 204
    assert (
        await client.post("/api/v1/auth/accept-invite", json=body)
    ).status_code == 410


async def test_a_token_only_works_for_its_own_purpose(client):
    await register(client, email="purpose@example.com")
    verify_token = latest_token("verify_email")
    resp = await client.post(
        "/api/v1/auth/reset-password",
        json={"token": verify_token, "password": "a-brand-new-passphrase"},
    )
    assert resp.status_code == 410


async def test_only_token_hashes_are_stored(client, db):
    await register(client, email="hashes@example.com")
    raw_verify = latest_token("verify_email")
    rows = (await db.execute(select(AuthToken))).scalars().all()
    assert [r.token_hash for r in rows] == [_sha(raw_verify)]
    assert all(raw_verify not in (r.token_hash or "") for r in rows)

    await client.post("/api/v1/auth/verify-email", json={"token": raw_verify})
    await login(client, "hashes@example.com", PW)
    raw_session = client.cookies.get(session_cookie_name())
    stored = (await db.execute(select(Session.token_hash))).scalars().all()
    assert stored == [_sha(raw_session)]
    assert raw_session not in stored


# --- Sessions --------------------------------------------------------------
async def test_reset_revokes_sessions_on_every_device(client):
    await register_verified(client, email="devices@example.com")
    await login(client, "devices@example.com", PW)
    phone = client.cookies.get(session_cookie_name())
    client.cookies.clear()
    await login(client, "devices@example.com", PW)
    laptop = client.cookies.get(session_cookie_name())
    assert phone != laptop

    await client.post(
        "/api/v1/auth/forgot-password", json={"email": "devices@example.com"}
    )
    token = latest_token("reset_password")
    await client.post(
        "/api/v1/auth/reset-password",
        json={"token": token, "password": "a-brand-new-passphrase"},
    )
    name = session_cookie_name()
    for cookie in (phone, laptop):
        client.cookies.clear()
        client.cookies.set(name, cookie)
        assert (await client.get("/api/v1/me")).status_code == 401


async def test_revoke_one_session_and_sign_out_everywhere(client):
    await register_verified(client, email="many@example.com")
    for _ in range(3):
        client.cookies.clear()
        await login(client, "many@example.com", PW)
    sessions = (await client.get("/api/v1/me/sessions")).json()
    assert len(sessions) == 3
    other = next(s for s in sessions if not s["current"])

    resp = await client.delete("/api/v1/me/sessions", params={"id": other["id"]})
    assert resp.status_code == 204
    assert len((await client.get("/api/v1/me/sessions")).json()) == 2

    missing = await client.delete(
        "/api/v1/me/sessions", params={"id": "00000000-0000-0000-0000-000000000000"}
    )
    assert missing.status_code == 404

    # Sign out everywhere: every other device goes, this one stays.
    assert (await client.delete("/api/v1/me/sessions")).status_code == 204
    remaining = (await client.get("/api/v1/me/sessions")).json()
    assert len(remaining) == 1 and remaining[0]["current"] is True


async def test_staff_session_expires_after_30_idle_minutes(client, db):
    await _add_staff(db, "idle-reviewer@example.com", "reviewer")
    resp = await login(client, "idle-reviewer@example.com", "staff-strong-password")
    assert resp.status_code == 200
    # Reviewer cookie lifetime is 8 hours, not 30 days.
    assert "Max-Age=28800" in resp.headers["set-cookie"]

    await db.execute(
        update(Session).values(last_seen_at=datetime.now(UTC) - timedelta(minutes=31))
    )
    await db.commit()
    assert (await client.get("/api/v1/me")).status_code == 401


async def test_user_session_survives_idle_and_rolls_forward(client, db):
    await register_verified(client, email="idle-user@example.com")
    await login(client, "idle-user@example.com", PW)
    await db.execute(
        update(Session).values(last_seen_at=datetime.now(UTC) - timedelta(hours=5))
    )
    await db.commit()
    me = await client.get("/api/v1/me")
    assert me.status_code == 200
    # Rolling 30-day lifetime: the cookie is re-issued with a fresh max-age.
    assert "Max-Age=2592000" in me.headers["set-cookie"]


async def test_expired_session_is_rejected(client, db):
    await register_verified(client, email="old-session@example.com")
    await login(client, "old-session@example.com", PW)
    await db.execute(
        update(Session).values(expires_at=datetime.now(UTC) - timedelta(seconds=1))
    )
    await db.commit()
    assert (await client.get("/api/v1/me")).status_code == 401


# --- Cookies ---------------------------------------------------------------
async def test_session_cookie_attributes_in_dev(client):
    await register_verified(client, email="cookie@example.com")
    resp = await login(client, "cookie@example.com", PW)
    header = resp.headers["set-cookie"]
    assert "HttpOnly" in header
    assert "SameSite=lax" in header
    assert "Path=/" in header
    assert "Domain" not in header


def test_session_cookie_is_host_prefixed_and_secure_in_production(monkeypatch):
    from app.config import get_settings

    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("EMAIL_DRIVER", "resend")
    monkeypatch.setenv("RESEND_API_KEY", "re_test_dummy")
    get_settings.cache_clear()
    try:
        response = Response()
        set_session_cookie(response, "tok", max_age=60)
        header = response.headers["set-cookie"]
        assert header.startswith("__Host-prohori_session=tok")
        assert "Secure" in header
        assert "HttpOnly" in header
        assert "SameSite=lax" in header
        assert "Path=/" in header
        assert "Domain" not in header
    finally:
        monkeypatch.undo()
        get_settings.cache_clear()


async def test_guest_cookie_is_httponly_and_only_its_hash_is_used(app, client):
    @app.get("/api/v1/_guest_probe")
    async def _probe(guest: str = Depends(get_guest_hash)) -> dict[str, str]:
        return {"guest": guest}

    first = await client.get("/api/v1/_guest_probe")
    header = first.headers["set-cookie"]
    assert header.startswith("prohori_guest=")
    assert "HttpOnly" in header and "SameSite=lax" in header
    raw = client.cookies.get("prohori_guest")
    assert raw and len(raw) >= 43  # 256-bit random value
    assert first.json()["guest"] == _sha(raw)
    assert first.json()["guest"] != raw

    # A returning guest keeps the same identity and is not re-issued a cookie.
    second = await client.get("/api/v1/_guest_probe")
    assert second.json()["guest"] == _sha(raw)
    assert "set-cookie" not in second.headers


async def test_guest_id_dependency_alias(app, client):
    from app.api.deps import guest_id

    @app.get("/api/v1/_guest_id_probe")
    async def _probe(gid: str = Depends(guest_id)) -> dict[str, str]:
        return {"guest": gid}

    resp = await client.get("/api/v1/_guest_id_probe")
    raw = client.cookies.get("prohori_guest")
    assert resp.json()["guest"] == _sha(raw)


# --- CSRF ------------------------------------------------------------------
@pytest.mark.parametrize(
    "method,path",
    [
        ("PATCH", "/api/v1/me"),
        ("DELETE", "/api/v1/me"),
        ("DELETE", "/api/v1/me/sessions"),
        ("POST", "/api/v1/me/password"),
        ("POST", "/api/v1/auth/logout"),
        ("POST", "/api/v1/auth/reset-password"),
    ],
)
async def test_csrf_header_required_on_every_state_change(raw_client, method, path):
    resp = await raw_client.request(method, path, json={})
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "csrf_failed"


async def test_reads_do_not_need_the_csrf_header(raw_client):
    resp = await raw_client.get("/api/v1/auth/session")
    assert resp.status_code == 200
    assert resp.json() is None


async def test_allowed_origin_passes_the_csrf_check(client):
    resp = await register(client, email="same-origin@example.com")
    assert resp.status_code == 202
    resp = await client.post(
        "/api/v1/auth/resend-verification",
        json={"email": "same-origin@example.com"},
        headers={"Origin": "http://localhost:5173"},
    )
    assert resp.status_code == 202


async def test_csrf_blocks_a_logged_in_cross_site_request(app, session_factory, client):
    await register_verified(client, email="csrf-victim@example.com")
    await login(client, "csrf-victim@example.com", PW)
    # The browser would attach the cookie, but a cross-site form cannot set
    # X-Requested-With, and a cross-site fetch carries a foreign Origin.
    cookie = client.cookies.get(session_cookie_name())
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(
        transport=transport, base_url="http://testserver"
    ) as evil:
        evil.cookies.set(session_cookie_name(), cookie)
        no_header = await evil.request(
            "DELETE", "/api/v1/me", json={"confirm": "DELETE"}
        )
        assert no_header.status_code == 403
        foreign = await evil.request(
            "DELETE",
            "/api/v1/me",
            json={"confirm": "DELETE"},
            headers={"X-Requested-With": "x", "Origin": "https://evil.example.com"},
        )
        assert foreign.status_code == 403
    # The account is intact.
    assert (await client.get("/api/v1/me")).status_code == 200


# --- Roles -----------------------------------------------------------------
async def test_role_guard_allows_admin_blocks_user_and_guest(app, client, db):
    @app.get("/api/v1/_staff_probe")
    async def _probe(
        _: User = Depends(require_role("reviewer", "admin")),
    ) -> dict[str, bool]:
        return {"ok": True}

    assert (await client.get("/api/v1/_staff_probe")).status_code == 401  # guest

    await register_verified(client, email="plain@example.com")
    await login(client, "plain@example.com", PW)
    assert (await client.get("/api/v1/_staff_probe")).status_code == 403

    await _add_staff(db, "boss@example.com", "admin")
    await client.post("/api/v1/auth/logout")
    await login(client, "boss@example.com", "staff-strong-password")
    assert (await client.get("/api/v1/_staff_probe")).status_code == 200


async def test_require_scope_dependency():
    from unittest.mock import MagicMock

    from app.api.deps import require_scope
    from app.errors import AppError
    from fastapi import Request

    guard = require_scope("checks:write")
    req = MagicMock(spec=Request)

    # Missing api_scopes attribute raises 403
    req.state = type("State", (), {})()
    with pytest.raises(AppError) as exc_info:
        await guard(req)
    assert exc_info.value.status == 403
    assert exc_info.value.code == "forbidden"

    # Insufficient scopes raises 403
    req.state.api_scopes = {"cases:read"}
    with pytest.raises(AppError) as exc_info:
        await guard(req)
    assert exc_info.value.status == 403

    # Granted scopes succeeds without error
    req.state.api_scopes = {"checks:write", "cases:read"}
    await guard(req)


async def test_profile_update_cannot_escalate_role(client):
    await register_verified(client, email="climber@example.com")
    await login(client, "climber@example.com", PW)
    resp = await client.patch("/api/v1/me", json={"role": "admin", "name": "Climber"})
    assert resp.status_code == 200
    assert resp.json()["role"] == "user"
