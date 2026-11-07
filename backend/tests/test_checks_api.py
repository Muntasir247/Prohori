"""End-to-end tests for checks, reports, reference data, and API key auth."""

from __future__ import annotations

from uuid import uuid4

import pytest
from app.models.api_key import ApiKey
from app.models.user import User, UserRole
from app.security.tokens import hash_token
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.fixture
async def verified_user(db: AsyncSession) -> User:
    from app.models.base import utcnow

    u = User(
        email=f"user-{uuid4().hex[:8]}@example.com",
        password_hash="argon2id$mocked",
        display_name="Test User",
        role=UserRole.user.value,
        email_verified_at=utcnow(),
    )
    db.add(u)
    await db.flush()
    return u


@pytest.fixture
async def api_key(db: AsyncSession) -> tuple[str, ApiKey]:
    raw_key = "prohori_live_" + uuid4().hex
    h = hash_token(raw_key)
    k = ApiKey(
        name="Partner Test Key",
        key_prefix="prohori_live_",
        key_hash=h,
        scopes=["checks:write"],
        rate_limit_per_min=60,
    )
    db.add(k)
    await db.flush()
    return raw_key, k


async def test_samples_and_tips(client: AsyncClient):
    # GET /api/v1/samples
    res = await client.get("/api/v1/samples")
    assert res.status_code == 200
    samples = res.json()
    assert len(samples) >= 3
    assert any(
        "লটারি" in s["body"] or "lottery" in s["body"] or "কোড" in s["body"]
        for s in samples
    )

    # GET /api/v1/tips/current
    tip_res = await client.get("/api/v1/tips/current")
    assert tip_res.status_code in (200, 204)
    if tip_res.status_code == 200:
        tip = tip_res.json()
        assert "title_bn" in tip

    # GET /api/v1/safe-actions
    act_res = await client.get("/api/v1/safe-actions?context=before_payment")
    assert act_res.status_code == 200
    actions = act_res.json()
    assert len(actions) > 0


async def test_check_message_guest_rule_only_high(client: AsyncClient):
    # Message with hard OTP/PIN rule
    payload = {
        "text": "আপনার একাউন্ট ব্লক করা হয়েছে। এখনই আপনার পিন এবং ওটিপি কোড 123456 পাঠান।",
        "claimed_sender": "bkash",
        "language_hint": "bn",
    }
    res = await client.post("/api/v1/check-message", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["final_level"] == "High"
    assert data["response_language"] == "bn"
    assert len(data["reasons"]) > 0
    assert "HARD_OTP_PIN_PASSWORD" in data["red_flags"] or any(
        "otp" in r.lower() for r in data["red_flags"]
    )
    # Helplines: bKash has verified 16247
    helpline = next(
        (
            a
            for a in data["safe_actions"]
            if a["id"] == "call_bkash_helpline" or a.get("phone") == "16247"
        ),
        None,
    )
    assert helpline is not None
    assert helpline["phone"] == "16247"

    check_id = data["id"]

    # Guest can retrieve their check
    get_res = await client.get(f"/api/v1/checks/{check_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == check_id


async def test_check_payment_flow(client: AsyncClient):
    payload = {
        "amount_bdt": 25000,
        "recipient_status": "new",
        "recipient_number": "01712345678",
        "request_channel": "phone_call",
        "rushed": "yes",
        "provider": "bkash",
    }
    res = await client.post("/api/v1/check-payment", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["final_level"] in ("High", "Medium", "Low")
    assert len(data["reasons"]) > 0
    assert len(data["safe_actions"]) > 0


async def test_api_key_auth(
    client: AsyncClient, api_key: tuple[str, ApiKey], db: AsyncSession
):
    raw_key, key_record = api_key
    payload = {
        "text": "জরুরি বার্তা: আপনার বিকাশ পিন কোড দিন দ্রুত",
    }
    # Success with valid key and checks:write scope
    res = await client.post(
        "/api/v1/check-message",
        json=payload,
        headers={"Authorization": f"Bearer {raw_key}"},
    )
    assert res.status_code == 200

    # Key without checks:write scope -> 403
    key_record.scopes = ["cases:read"]
    await db.flush()

    res_forbidden = await client.post(
        "/api/v1/check-message",
        json=payload,
        headers={"Authorization": f"Bearer {raw_key}"},
    )
    assert res_forbidden.status_code == 403


async def test_report_check_idempotent_and_updates_numbers(client: AsyncClient):
    # Create check
    payload = {
        "text": "আপনার লটারি 50000 টাকা জিততে যোগাযোগ করুন 01711122233",
        "claimed_sender": "nagad",
    }
    res = await client.post("/api/v1/check-message", json=payload)
    assert res.status_code == 200
    check_id = res.json()["id"]

    # Report without consent -> 422
    fail_rep = await client.post(
        f"/api/v1/checks/{check_id}/report",
        json={"consent": False},
    )
    assert fail_rep.status_code == 422

    # Report with consent -> success
    rep1 = await client.post(
        f"/api/v1/checks/{check_id}/report",
        json={"consent": True, "note": "Fraudulent lottery SMS"},
    )
    assert rep1.status_code == 200
    ref1 = rep1.json()["reference"]
    assert ref1.startswith("PRO-")

    # Idempotent: report again -> same reference
    rep2 = await client.post(
        f"/api/v1/checks/{check_id}/report",
        json={"consent": True},
    )
    assert rep2.status_code == 200
    assert rep2.json()["reference"] == ref1

    # Check detail now reports has_reported=True
    detail = await client.get(f"/api/v1/checks/{check_id}")
    assert detail.status_code == 200
    assert detail.json()["has_reported"] is True
    assert detail.json()["report_reference"] == ref1


async def test_user_history_and_delete_flow(
    client: AsyncClient, verified_user: User, db: AsyncSession
):
    from app.api.cookies import session_cookie_name
    from app.models.session import Session as UserSession
    from app.security.tokens import hash_token, new_token

    raw_token = new_token()
    s = UserSession(
        user_id=verified_user.id,
        token_hash=hash_token(raw_token),
        expires_at=verified_user.created_at,
    )
    # Give user a session
    from datetime import timedelta

    from app.models.base import utcnow

    s.expires_at = utcnow() + timedelta(days=7)
    db.add(s)
    await db.flush()

    client.cookies.set(session_cookie_name(), raw_token)

    # User performs 2 checks
    c1 = await client.post(
        "/api/v1/check-message", json={"text": "আপনার লটারি 50000 টাকা জিততে যোগাযোগ করুন"}
    )
    assert c1.status_code == 200
    id1 = c1.json()["id"]

    c2 = await client.post(
        "/api/v1/check-message", json={"text": "আপনার একাউন্ট যাচাই করতে ওটিপি কোড দিন"}
    )
    assert c2.status_code == 200
    id2 = c2.json()["id"]

    # History shows 2 checks
    hist = await client.get("/api/v1/checks")
    assert hist.status_code == 200
    items = hist.json()["items"]
    assert len(items) >= 2

    # Report c2
    rep = await client.post(f"/api/v1/checks/{id2}/report", json={"consent": True})
    assert rep.status_code == 200

    # Try delete c2 -> 409 (cannot delete reported check)
    del_rep = await client.delete(f"/api/v1/checks/{id2}")
    assert del_rep.status_code == 409

    # Delete c1 -> 204
    del_c1 = await client.delete(f"/api/v1/checks/{id1}")
    assert del_c1.status_code == 204

    # c1 is now gone from detail
    get_del = await client.get(f"/api/v1/checks/{id1}")
    assert get_del.status_code == 404
