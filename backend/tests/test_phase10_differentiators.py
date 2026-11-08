"""Tests for Phase 10: Differentiators (Doc 02 Features F32, F33, F34, F37).

Tests:
1. Pressure pause ack (finished / skipped) recorded in checks.pause_outcome.
2. Ask someone you trust:
   - POST /checks/{id}/share creates 24h share.
   - GET /shares/{token} returns masked content and X-Robots-Tag header.
   - Zero leakage: shared response exposes NO names, full numbers, user data, or check IDs.
   - DELETE /checks/{id}/share revokes token -> returns 410.
   - Expired token returns 410.
   - Invalid token returns 410.
3. Already Sent Money:
   - GET /safe-actions?context=after_payment returns ordered actions, open without auth.
"""

from __future__ import annotations

from datetime import timedelta
from uuid import uuid4

import pytest
from app.api.cookies import guest_cookie_name
from app.models.base import utcnow
from app.models.check import Check, Share
from app.models.knowledge import SafeAction
from app.security.tokens import hash_token
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

TEST_RAW_GUEST_TOKEN = "raw_guest_secret_12345"


@pytest.fixture
async def sample_high_check(db: AsyncSession) -> Check:
    """Create a sample High risk check for testing."""
    check = Check(
        id=uuid4(),
        user_id=None,
        guest_hash=hash_token(TEST_RAW_GUEST_TOKEN),
        kind="message",
        final_level="High",
        masked_text="জরুরি নোটিশ: আপনার বিকাশ একাউন্ট সাময়িক স্থগিত। [PHONE_1]",
        text_hash="dummy_text_hash_123",
        reasons=["জরুরি টাকা পাঠানোর চাপ", "ভুয়া স্থগিত নোটিশ"],
        created_at=utcnow(),
    )
    db.add(check)
    await db.commit()
    await db.refresh(check)
    return check


async def test_pressure_pause_ack(
    client: AsyncClient, sample_high_check: Check, db: AsyncSession
):
    """POST /checks/{id}/pause-ack records finished or skipped in checks.pause_outcome."""
    check_id = str(sample_high_check.id)
    client.cookies.set(guest_cookie_name(), TEST_RAW_GUEST_TOKEN)

    # 1. Skip outcome
    res_skip = await client.post(
        f"/api/v1/checks/{check_id}/pause-ack",
        json={"outcome": "skipped"},
    )
    assert res_skip.status_code == 200
    assert res_skip.json()["outcome"] == "skipped"

    # Verify database update
    await db.refresh(sample_high_check)
    assert sample_high_check.pause_outcome == "skipped"

    # 2. Finished outcome
    res_finish = await client.post(
        f"/api/v1/checks/{check_id}/pause-ack",
        json={"outcome": "finished"},
    )
    assert res_finish.status_code == 200
    assert res_finish.json()["outcome"] == "finished"

    await db.refresh(sample_high_check)
    assert sample_high_check.pause_outcome == "finished"

    # 3. Invalid outcome validation
    res_invalid = await client.post(
        f"/api/v1/checks/{check_id}/pause-ack",
        json={"outcome": "cancelled"},
    )
    assert res_invalid.status_code == 422


async def test_share_lifecycle_and_zero_leakage(
    client: AsyncClient, sample_high_check: Check, db: AsyncSession
):
    """Verify share creation, retrieval, privacy boundaries, and revocation."""
    check_id = str(sample_high_check.id)
    client.cookies.set(guest_cookie_name(), TEST_RAW_GUEST_TOKEN)

    # 1. Create share link
    create_res = await client.post(f"/api/v1/checks/{check_id}/share")
    assert create_res.status_code == 200
    data = create_res.json()
    token = data["token"]
    share_url = data["share_url"]
    assert share_url == f"/s/{token}"
    assert "expires_at" in data

    # 2. Retrieve public shared result (no cookies needed: public endpoint)
    share_res = await client.get(f"/api/v1/shares/{token}")
    assert share_res.status_code == 200

    # Test X-Robots-Tag header is present to prevent search engine indexing
    assert share_res.headers.get("X-Robots-Tag") == "noindex, nofollow"

    shared_data = share_res.json()
    assert shared_data["level"] == "High"
    assert "[PHONE_1]" in shared_data["masked_text"]
    assert len(shared_data["reasons"]) >= 1

    # 3. STRICT ZERO-LEAKAGE VERIFICATION:
    # No check ID, user ID, raw phone numbers, or account names exposed in shared payload
    assert "id" not in shared_data or shared_data.get("id") != check_id
    assert check_id not in str(shared_data)
    assert "user_id" not in shared_data
    assert "guest_hash" not in shared_data
    assert "017" not in str(shared_data)
    assert "018" not in str(shared_data)
    assert "019" not in str(shared_data)

    # 4. Revoke share link
    revoke_res = await client.delete(f"/api/v1/checks/{check_id}/share")
    assert revoke_res.status_code == 204

    # 5. Subsequent access gives 410 Gone
    revoked_res = await client.get(f"/api/v1/shares/{token}")
    assert revoked_res.status_code == 410
    assert revoked_res.json()["error"]["code"] == "share_expired_or_invalid"


async def test_share_token_probing_defense_and_expiry(
    client: AsyncClient, sample_high_check: Check, db: AsyncSession
):
    """Invalid and expired tokens must both return identical 410 responses."""
    # 1. Invalid random token returns 410 (not 404, preventing probing)
    invalid_token = "completely_random_token_1234567890abcdef"
    inv_res = await client.get(f"/api/v1/shares/{invalid_token}")
    assert inv_res.status_code == 410
    assert inv_res.json()["error"]["code"] == "share_expired_or_invalid"

    # 2. Expired token returns 410
    expired_token = "expired_token_abcdef123456"
    expired_share = Share(
        check_id=sample_high_check.id,
        token_hash=hash_token(expired_token),
        expires_at=utcnow() - timedelta(hours=1),
        revoked_at=None,
        created_at=utcnow() - timedelta(hours=25),
    )
    db.add(expired_share)
    await db.commit()

    exp_res = await client.get(f"/api/v1/shares/{expired_token}")
    assert exp_res.status_code == 410
    assert exp_res.json()["error"]["code"] == "share_expired_or_invalid"


async def test_safe_actions_after_payment_endpoint(
    client: AsyncClient, db: AsyncSession
):
    """GET /safe-actions?context=after_payment returns ordered actions without auth."""
    # Ensure seed safe action exists in test database
    action = SafeAction(
        id="test_do_not_pay_recovery",
        label_en="Do not pay anyone to get your money back",
        label_bn="টাকা ফেরত পেতে কাউকে টাকা দেবেন না",
        body_en="No one who can really return your money will ask for a fee first.",
        body_bn="যে সত্যিই আপনার টাকা ফেরত দিতে পারে, সে আগে কোনো ফি চাইবে না।",
        context="after_payment",
        min_level="Low",
        provider=None,
        phone=None,
        is_active=True,
    )
    db.add(action)
    await db.commit()

    res = await client.get("/api/v1/safe-actions?context=after_payment")
    assert res.status_code == 200
    items = res.json()
    assert isinstance(items, list)
    assert len(items) >= 1
    assert any(a["id"] == "test_do_not_pay_recovery" for a in items)
    for a in items:
        assert a["context"] in ("after_payment", "both")
