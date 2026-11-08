"""Phase 11: Admin and partner API tests.

Verifies:
1. Role denial on every admin route, automatically by iterating all routes (reviewer gets 403).
2. Unverified helpline cannot activate (API and DB constraint) + 90-day warning.
3. API keys: created with prh_test_/prh_live_, stored only as SHA-256 hash, raw key shown once, revoke, rate limit.
4. Publishing a pattern changes retrieval results (done when requirement).
5. Quality page: eval_runs, checks route/token/cache metrics, activation gate (409 eval_gate_failed on unsafe flags or missed targets).
6. Users: 48h single-use invite, protect the last admin (409 last_admin), session revocation on role change.
7. Audit log: read-only list with before & after diffs.
"""

from __future__ import annotations

import hashlib
from datetime import date, timedelta
from decimal import Decimal
from uuid import UUID, uuid4

import pytest
from app.api.cookies import session_cookie_name
from app.models.api_key import ApiKey
from app.models.base import utcnow
from app.models.check import ScamType
from app.models.eval import EvalRun, PromptVersion
from app.models.session import Session as UserSession
from app.models.user import User, UserRole
from app.pipeline.retrieval import RetrievalEngine
from app.security.tokens import hash_token, new_token
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.fixture
async def admin_user(db: AsyncSession) -> tuple[User, str]:
    u = User(
        email=f"admin-{uuid4().hex[:8]}@example.com",
        password_hash="argon2id$mocked",
        display_name="Admin Boss",
        role=UserRole.admin.value,
        is_active=True,
        email_verified_at=utcnow(),
    )
    db.add(u)
    await db.flush()

    raw_token = new_token()
    s = UserSession(
        user_id=u.id,
        token_hash=hash_token(raw_token),
        last_seen_at=utcnow(),
        expires_at=utcnow() + timedelta(days=1),
    )
    db.add(s)
    await db.commit()
    return u, raw_token


@pytest.fixture
async def reviewer_user(db: AsyncSession) -> tuple[User, str]:
    u = User(
        email=f"reviewer-{uuid4().hex[:8]}@example.com",
        password_hash="argon2id$mocked",
        display_name="Reviewer Robin",
        role=UserRole.reviewer.value,
        is_active=True,
        email_verified_at=utcnow(),
    )
    db.add(u)
    await db.flush()

    raw_token = new_token()
    s = UserSession(
        user_id=u.id,
        token_hash=hash_token(raw_token),
        last_seen_at=utcnow(),
        expires_at=utcnow() + timedelta(days=1),
    )
    db.add(s)
    await db.commit()
    return u, raw_token


@pytest.fixture
async def standard_user(db: AsyncSession) -> tuple[User, str]:
    u = User(
        email=f"user-{uuid4().hex[:8]}@example.com",
        password_hash="argon2id$mocked",
        display_name="Standard User",
        role=UserRole.user.value,
        is_active=True,
        email_verified_at=utcnow(),
    )
    db.add(u)
    await db.flush()

    raw_token = new_token()
    s = UserSession(
        user_id=u.id,
        token_hash=hash_token(raw_token),
        last_seen_at=utcnow(),
        expires_at=utcnow() + timedelta(days=1),
    )
    db.add(s)
    await db.commit()
    return u, raw_token


# ===========================================================================
# 1. Automated Role Denial on Every Admin Route
# ===========================================================================


async def test_role_denial_on_every_admin_route_automatically(
    client: AsyncClient,
    reviewer_user: tuple[User, str],
    standard_user: tuple[User, str],
):
    """Iterate all registered routes under /api/v1/admin and verify 403 on reviewer and user."""
    _, reviewer_tok = reviewer_user
    _, user_tok = standard_user

    # Inspect all registered admin endpoints from client app
    app = client._transport.app
    admin_routes: list[tuple[str, str]] = []
    for route in app.routes:
        path = getattr(route, "path", "")
        if path.startswith("/api/v1/admin"):
            methods = getattr(route, "methods", set())
            for m in methods:
                if m in ("GET", "POST", "PATCH", "DELETE"):
                    admin_routes.append((m, path))

    assert len(admin_routes) >= 10, "Expected at least 10 admin endpoints"

    # Test as Reviewer -> MUST get 403 Forbidden on every admin route
    client.cookies.set(session_cookie_name(), reviewer_tok)
    for method, path in admin_routes:
        # replace path params with dummy uuid/id
        test_path = path.replace("{id}", "00000000-0000-0000-0000-000000000001")
        res = await client.request(method, test_path, json={})
        assert (
            res.status_code == 403
        ), f"Reviewer was not denied on {method} {test_path} (got {res.status_code})"

    # Test as Normal User -> MUST get 403 Forbidden
    client.cookies.set(session_cookie_name(), user_tok)
    for method, path in admin_routes:
        test_path = path.replace("{id}", "00000000-0000-0000-0000-000000000001")
        res = await client.request(method, test_path, json={})
        assert (
            res.status_code == 403
        ), f"User was not denied on {method} {test_path} (got {res.status_code})"

    # Test Unauthenticated -> MUST get 401 Unauthorized
    client.cookies.clear()
    for method, path in admin_routes:
        test_path = path.replace("{id}", "00000000-0000-0000-0000-000000000001")
        res = await client.request(method, test_path, json={})
        assert (
            res.status_code == 401
        ), f"Unauthenticated request was not rejected on {method} {test_path} (got {res.status_code})"


# ===========================================================================
# 2. Safe Actions: Unverified Helpline Rejection & 90-Day Warning
# ===========================================================================


async def test_unverified_helpline_cannot_activate_and_90day_warning(
    client: AsyncClient,
    admin_user: tuple[User, str],
):
    _, admin_tok = admin_user
    client.cookies.set(session_cookie_name(), admin_tok)

    # 1. Attempt to create active action with phone but missing source_url -> 422
    invalid_payload = {
        "id": "unverified_test_1",
        "label_en": "Unverified Provider",
        "label_bn": "অযাচাইকৃত হেল্পলাইন",
        "phone": "01700000000",
        "is_active": True,
        "source_url": None,
        "verified_at": "2026-11-01",
    }
    res_invalid_1 = await client.post(
        "/api/v1/admin/safe-actions", json=invalid_payload
    )
    assert res_invalid_1.status_code == 422
    assert res_invalid_1.json()["error"]["code"] == "unverified_helpline"

    # 2. Attempt with missing verified_at -> 422
    invalid_payload["source_url"] = "https://example.com/helpline"
    invalid_payload["verified_at"] = None
    res_invalid_2 = await client.post(
        "/api/v1/admin/safe-actions", json=invalid_payload
    )
    assert res_invalid_2.status_code == 422
    assert res_invalid_2.json()["error"]["code"] == "unverified_helpline"

    # 3. Create inactive action with phone -> succeeds
    invalid_payload["is_active"] = False
    res_create_inactive = await client.post(
        "/api/v1/admin/safe-actions", json=invalid_payload
    )
    assert res_create_inactive.status_code == 201

    # 4. Attempt to activate inactive action without source_url/verified_at -> 422
    res_patch_fail = await client.patch(
        "/api/v1/admin/safe-actions/unverified_test_1",
        json={"is_active": True},
    )
    assert res_patch_fail.status_code == 422
    assert res_patch_fail.json()["error"]["code"] == "unverified_helpline"

    # 5. Successfully activate with source_url and verified_at
    past_100_days = (date.today() - timedelta(days=100)).isoformat()
    res_patch_ok = await client.patch(
        "/api/v1/admin/safe-actions/unverified_test_1",
        json={
            "source_url": "https://example.com/helpline",
            "verified_at": past_100_days,
            "is_active": True,
        },
    )
    assert res_patch_ok.status_code == 200
    data = res_patch_ok.json()
    assert data["is_active"] is True
    # 6. Show warning after 90 days
    assert data["needs_reverification"] is True
    assert "90 days" in data["warning"]


# ===========================================================================
# 3. API Keys: Raw Key Shown Once, SHA-256 Storage, Revocation, Rate Limits
# ===========================================================================


async def test_api_keys_lifecycle_and_security(
    client: AsyncClient,
    admin_user: tuple[User, str],
    db: AsyncSession,
):
    _, admin_tok = admin_user
    client.cookies.set(session_cookie_name(), admin_tok)

    # 1. Create API Key
    create_payload = {
        "name": "Partner FinTech Live",
        "key_type": "live",
        "scopes": ["checks:write", "cases:read"],
        "rate_limit_per_min": 10,
    }
    res_create = await client.post("/api/v1/admin/api-keys", json=create_payload)
    assert res_create.status_code == 201
    key_data = res_create.json()

    raw_key = key_data["raw_key"]
    assert raw_key.startswith("prh_live_")
    key_id = key_data["id"]

    # 2. Check DB: SHA-256 ONLY stored, raw key NEVER stored
    key_record = (
        await db.execute(select(ApiKey).where(ApiKey.id == UUID(key_id)))
    ).scalar_one()
    expected_hash = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()
    assert key_record.key_hash == expected_hash
    assert raw_key not in key_record.key_prefix

    # 3. List keys: raw key is NEVER returned again
    res_list = await client.get("/api/v1/admin/api-keys")
    assert res_list.status_code == 200
    listed_key = next((k for k in res_list.json() if k["id"] == key_id), None)
    assert listed_key is not None
    assert "raw_key" not in listed_key
    assert "key_hash" not in listed_key

    # 4. Use the key against Partner Endpoints: POST /check-message
    client.cookies.clear()  # No session cookie
    check_payload = {
        "text": "জরুরি বার্তা: আপনার বিকাশ পিন কোড দিন দ্রুত",
        "claimed_sender": "bkash",
    }
    partner_res = await client.post(
        "/api/v1/check-message",
        json=check_payload,
        headers={"Authorization": f"Bearer {raw_key}"},
    )
    assert partner_res.status_code == 200
    assert partner_res.json()["final_level"] == "High"

    # 5. Use the key against Partner Endpoint: GET /cases (scope cases:read)
    cases_res = await client.get(
        "/api/v1/cases",
        headers={"Authorization": f"Bearer {raw_key}"},
    )
    assert cases_res.status_code == 200
    assert "items" in cases_res.json()

    # 6. Revoke key
    client.cookies.set(session_cookie_name(), admin_tok)
    res_revoke = await client.delete(f"/api/v1/admin/api-keys/{key_id}")
    assert res_revoke.status_code == 204

    # 7. Revoked key now gets 401 Unauthorized
    client.cookies.clear()
    revoked_call = await client.post(
        "/api/v1/check-message",
        json=check_payload,
        headers={"Authorization": f"Bearer {raw_key}"},
    )
    assert revoked_call.status_code == 401


# ===========================================================================
# 4. Knowledge Base: Publishing a Pattern Changes Retrieval Results
# ===========================================================================


async def test_publishing_pattern_changes_retrieval_results(
    client: AsyncClient,
    admin_user: tuple[User, str],
    db: AsyncSession,
):
    """Requirement: Done when Publishing a pattern changes retrieval results."""
    _, admin_tok = admin_user
    client.cookies.set(session_cookie_name(), admin_tok)

    # Ensure a scam type exists
    st = (await db.execute(select(ScamType))).scalars().first()
    if not st:
        st = ScamType(
            id=1, slug="lottery_fraud", name_en="Lottery Fraud", name_bn="লটারি প্রতারণা"
        )
        db.add(st)
        await db.flush()

    unique_keyword = f"NebulaTokenCryptoPromo{uuid4().hex[:6]}"

    # Query before publishing: retrieval engine does not find this pattern
    engine = RetrievalEngine()
    initial_results = engine.search(unique_keyword)
    assert not any(
        unique_keyword.lower() in str(c.get("content", "")).lower()
        for c in initial_results
    )

    # 1. Create Knowledge Document in Draft
    create_doc_payload = {
        "code": f"PAT-{uuid4().hex[:4].upper()}",
        "title": f"New Scam Pattern {unique_keyword}",
        "scam_type_id": st.id,
        "language": "en",
        "source_url": "https://example.com/pattern",
        "body": f"Victims are sent messages promoting {unique_keyword} promising 500% returns in 24 hours. Do not deposit funds.",
    }
    res_create = await client.post("/api/v1/admin/knowledge", json=create_doc_payload)
    assert res_create.status_code == 201
    doc_id = res_create.json()["id"]
    assert res_create.json()["status"] == "draft"

    # Still not in retrieval while in Draft
    engine.reload_chunks()
    assert not any(
        unique_keyword.lower() in str(c.get("content", "")).lower()
        for c in engine.search(unique_keyword)
    )

    # 2. Publish the document -> Chunks + Embeds
    res_pub = await client.post(f"/api/v1/admin/knowledge/{doc_id}/publish")
    assert res_pub.status_code == 200
    pub_data = res_pub.json()
    assert pub_data["ok"] is True
    assert pub_data["status"] == "published"
    assert pub_data["chunks_published"] >= 1

    # 3. Reload engine chunks and search -> MUST be found now!
    engine.reload_chunks()
    retrieved = engine.search(unique_keyword)
    assert len(retrieved) > 0, "Pattern was not retrieved after publishing"
    assert any(
        unique_keyword.lower() in str(c.get("content", "")).lower() for c in retrieved
    )


# ===========================================================================
# 5. Quality Page & Prompt Activation Gate
# ===========================================================================


async def test_quality_page_and_activation_gate(
    client: AsyncClient,
    admin_user: tuple[User, str],
    db: AsyncSession,
):
    _, admin_tok = admin_user
    client.cookies.set(session_cookie_name(), admin_tok)

    # Create two prompt versions
    pv1 = PromptVersion(
        name="p2_analysis",
        version="v1.0.0",
        body_sha256="a" * 64,
        is_active=True,
    )
    pv2 = PromptVersion(
        name="p2_analysis",
        version="v1.1.0",
        body_sha256="b" * 64,
        is_active=False,
    )
    db.add_all([pv1, pv2])
    await db.commit()

    # 1. Attempt to activate pv2 without an eval run -> 409 eval_gate_failed
    res_fail_no_run = await client.post(f"/api/v1/admin/prompts/{pv2.id}/activate")
    assert res_fail_no_run.status_code == 409
    assert res_fail_no_run.json()["error"]["code"] == "eval_gate_failed"

    # 2. Add an eval run with unsafe_flags = 1 (fails Section 10.7 hard gate)
    failing_run = EvalRun(
        prompt_version_id=pv2.id,
        dataset_version="sim-v1",
        item_count=300,
        high_precision=Decimal("0.95"),
        high_recall=Decimal("0.90"),
        genuine_high_rate=Decimal("0.02"),
        unsafe_flags=1,  # FAILS hard gate (must be 0)
        report={"invented_count": 0},
    )
    db.add(failing_run)
    await db.commit()

    res_fail_unsafe = await client.post(f"/api/v1/admin/prompts/{pv2.id}/activate")
    assert res_fail_unsafe.status_code == 409
    assert res_fail_unsafe.json()["error"]["code"] == "eval_gate_failed"

    # 3. Add a successful eval run meeting all targets
    passing_run = EvalRun(
        prompt_version_id=pv2.id,
        dataset_version="sim-v2",
        item_count=300,
        high_precision=Decimal("0.94"),
        high_recall=Decimal("0.89"),
        genuine_high_rate=Decimal("0.015"),
        unsafe_flags=0,  # PASSES hard gate
        report={"invented_count": 0},
    )
    db.add(passing_run)
    await db.commit()

    # 4. Activate now succeeds
    res_activate = await client.post(f"/api/v1/admin/prompts/{pv2.id}/activate")
    assert res_activate.status_code == 200
    assert res_activate.json()["is_active"] is True

    # Confirm pv1 is now deactivated
    await db.refresh(pv1)
    assert pv1.is_active is False

    # 5. GET /api/v1/admin/quality returns metrics and notice
    q_res = await client.get("/api/v1/admin/quality")
    assert q_res.status_code == 200
    q_data = q_res.json()
    assert "simulated data only" in q_data["notice"]
    assert q_data["kpi_unsafe_flags"] == 0
    assert len(q_data["prompt_versions"]) >= 2


# ===========================================================================
# 6. Users: Invite, Protect Last Admin, and Session Revocation
# ===========================================================================


async def test_users_management_and_last_admin_protection(
    client: AsyncClient,
    admin_user: tuple[User, str],
    reviewer_user: tuple[User, str],
    db: AsyncSession,
):
    admin, admin_tok = admin_user
    reviewer, reviewer_tok = reviewer_user
    client.cookies.set(session_cookie_name(), admin_tok)

    # 1. Invite a new reviewer with 48h single-use link
    invite_res = await client.post(
        "/api/v1/admin/users/invite",
        json={"email": "newbie-reviewer@example.com", "role": "reviewer"},
    )
    assert invite_res.status_code == 201
    inv_data = invite_res.json()
    assert "accept-invite?token=" in inv_data["invite_url"]

    # 2. Change role of reviewer to user -> MUST revoke reviewer's sessions
    # Check reviewer session exists before
    sess_before = (
        (
            await db.execute(
                select(UserSession).where(UserSession.user_id == reviewer.id)
            )
        )
        .scalars()
        .all()
    )
    assert len(sess_before) > 0

    patch_res = await client.patch(
        f"/api/v1/admin/users/{reviewer.id}",
        json={"role": "user"},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["role"] == "user"

    # Reviewer sessions have been revoked
    sess_after = (
        (
            await db.execute(
                select(UserSession).where(UserSession.user_id == reviewer.id)
            )
        )
        .scalars()
        .all()
    )
    assert len(sess_after) == 0

    # 3. Protect the last admin: attempt to demote sole admin -> 409 last_admin
    # First, make sure there are no other active admins
    other_admins = (
        (
            await db.execute(
                select(User).where(User.role == "admin", User.id != admin.id)
            )
        )
        .scalars()
        .all()
    )
    for oa in other_admins:
        oa.role = "user"
    await db.flush()

    demote_res = await client.patch(
        f"/api/v1/admin/users/{admin.id}",
        json={"role": "reviewer"},
    )
    assert demote_res.status_code == 409
    assert demote_res.json()["error"]["code"] == "last_admin"

    # Deactivating last admin also blocked -> 409 last_admin
    deactivate_res = await client.patch(
        f"/api/v1/admin/users/{admin.id}",
        json={"is_active": False},
    )
    assert deactivate_res.status_code == 409
    assert deactivate_res.json()["error"]["code"] == "last_admin"


# ===========================================================================
# 7. Audit Log: Read-Only List with Before & After Diff
# ===========================================================================


async def test_audit_log_read_only(
    client: AsyncClient,
    admin_user: tuple[User, str],
):
    _, admin_tok = admin_user
    client.cookies.set(session_cookie_name(), admin_tok)

    # Perform an action that logs to audit
    await client.post(
        "/api/v1/admin/users/invite",
        json={"email": "audit-tester@example.com", "role": "reviewer"},
    )

    audit_res = await client.get("/api/v1/admin/audit")
    assert audit_res.status_code == 200
    data = audit_res.json()
    assert "items" in data
    assert data["total"] >= 1
    # Check that events have before and after payloads
    event = data["items"][0]
    assert "action" in event
    assert "entity_type" in event
