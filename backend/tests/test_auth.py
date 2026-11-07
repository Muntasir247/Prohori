"""Authentication flow tests (Doc 02 Section 7, Phase 04 acceptance).

Covers: account-discovery safety, email verification, login + lockout,
unverified login, token expiry and reuse, reset revoking sessions, logout, CSRF.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from app.api.cookies import session_cookie_name
from app.models.auth_token import AuthToken
from app.services.email import get_outbox
from sqlalchemy import select

from tests.helpers import latest_token, login, register, register_verified


async def test_register_returns_202_and_emails_a_link(client):
    resp = await register(client)
    assert resp.status_code == 202
    assert resp.json() == {"ok": True}
    # Email carries a link, never a code.
    sent = get_outbox()[-1]
    assert sent.purpose == "verify_email"
    assert "/verify-email?token=" in sent.link


async def test_duplicate_email_gives_the_same_response(client):
    first = await register(client, email="dup@example.com")
    second = await register(client, email="dup@example.com")
    assert first.status_code == second.status_code == 202
    assert first.json() == second.json()


async def test_register_requires_consent(client):
    resp = await register(client, consent=False)
    assert resp.status_code == 422
    assert resp.json()["error"]["fields"].get("consent")


async def test_register_rejects_weak_password(client):
    resp = await register(client, password="short")
    assert resp.status_code == 422
    assert resp.json()["error"]["fields"].get("password")


async def test_verify_email_then_login(client):
    await register_verified(client, email="verify@example.com")
    resp = await login(client, "verify@example.com", "correct-horse-battery")
    assert resp.status_code == 200
    assert resp.json()["email"] == "verify@example.com"
    assert resp.cookies.get(session_cookie_name())


async def test_login_before_verification_is_forbidden(client):
    await register(client, email="pending@example.com")
    resp = await login(client, "pending@example.com", "correct-horse-battery")
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "email_unverified"


async def test_login_wrong_password_is_401_same_message(client):
    await register_verified(client, email="pw@example.com")
    wrong = await login(client, "pw@example.com", "wrong-password-here")
    unknown = await login(client, "nobody@example.com", "wrong-password-here")
    assert wrong.status_code == unknown.status_code == 401
    # Identical error for wrong password and unknown account (no discovery).
    assert wrong.json()["error"]["code"] == unknown.json()["error"]["code"]


async def test_five_failures_lock_for_15_minutes(client):
    await register_verified(client, email="lock@example.com")
    for _ in range(5):
        r = await login(client, "lock@example.com", "definitely-wrong")
        assert r.status_code == 401
    # Locked now — even the correct password is refused with 429.
    locked = await login(client, "lock@example.com", "correct-horse-battery")
    assert locked.status_code == 429
    assert locked.headers.get("Retry-After")
    assert int(locked.headers["Retry-After"]) <= 15 * 60


async def test_expired_verification_token_fails(client, db):
    await register(client, email="expire@example.com")
    token = latest_token("verify_email")
    # Fast-forward: expire the token in the database.
    row = (
        await db.execute(select(AuthToken).where(AuthToken.purpose == "verify_email"))
    ).scalar_one()
    row.expires_at = datetime.now(UTC) - timedelta(minutes=1)
    await db.commit()

    resp = await client.post("/api/v1/auth/verify-email", json={"token": token})
    assert resp.status_code == 410


async def test_reused_token_fails(client):
    await register(client, email="reuse@example.com")
    token = latest_token("verify_email")
    first = await client.post("/api/v1/auth/verify-email", json={"token": token})
    assert first.status_code == 204
    second = await client.post("/api/v1/auth/verify-email", json={"token": token})
    assert second.status_code == 410


async def test_reset_password_revokes_sessions(client):
    await register_verified(client, email="reset@example.com")
    signed_in = await login(client, "reset@example.com", "correct-horse-battery")
    assert signed_in.status_code == 200
    # The client now holds a valid session cookie.
    me = await client.get("/api/v1/me")
    assert me.status_code == 200

    await client.post(
        "/api/v1/auth/forgot-password", json={"email": "reset@example.com"}
    )
    token = latest_token("reset_password")
    reset = await client.post(
        "/api/v1/auth/reset-password",
        json={"token": token, "password": "a-brand-new-passphrase"},
    )
    assert reset.status_code == 204

    # The previously valid session is now revoked.
    me_after = await client.get("/api/v1/me")
    assert me_after.status_code == 401
    # The new password works.
    relogin = await login(client, "reset@example.com", "a-brand-new-passphrase")
    assert relogin.status_code == 200


async def test_logout_revokes_the_current_session(client):
    await register_verified(client, email="out@example.com")
    await login(client, "out@example.com", "correct-horse-battery")
    assert (await client.get("/api/v1/me")).status_code == 200
    out = await client.post("/api/v1/auth/logout")
    assert out.status_code == 204
    assert (await client.get("/api/v1/me")).status_code == 401


async def test_resend_verification_is_rate_limited_to_3_per_hour(client):
    await register(client, email="resend@example.com")
    codes = []
    for _ in range(4):
        r = await client.post(
            "/api/v1/auth/resend-verification",
            json={"email": "resend@example.com"},
        )
        codes.append(r.status_code)
    assert codes[:3] == [202, 202, 202]
    assert codes[3] == 429


async def test_accept_invite_creates_a_reviewer(client, db):
    from app.services import auth as auth_service
    from app.services.email import EmailService

    token = await auth_service.create_invite(
        db, email="rev@example.com", role="reviewer", email_service=EmailService()
    )
    await db.commit()

    resp = await client.post(
        "/api/v1/auth/accept-invite",
        json={"token": token, "name": "Rev Iewer", "password": "reviewer-strong-pw"},
    )
    assert resp.status_code == 204
    # The invited reviewer can log in immediately (invite implies verified).
    signed_in = await login(client, "rev@example.com", "reviewer-strong-pw")
    assert signed_in.status_code == 200
    assert signed_in.json()["role"] == "reviewer"


@pytest.mark.parametrize(
    "path,body",
    [
        ("/api/v1/auth/register", {"name": "x", "email": "a@b.co", "password": "p"}),
        ("/api/v1/auth/login", {"email": "a@b.co", "password": "p"}),
    ],
)
async def test_state_change_without_csrf_header_is_rejected(raw_client, path, body):
    resp = await raw_client.post(path, json=body)
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "csrf_failed"


async def test_cross_origin_state_change_is_rejected(client):
    resp = await client.post(
        "/api/v1/auth/register",
        json={"name": "x", "email": "evil@b.co", "password": "p", "consent": True},
        headers={"Origin": "https://evil.example.com"},
    )
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "csrf_failed"
