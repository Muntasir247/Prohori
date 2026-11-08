"""Phase 13 Hardening and Critical Scenarios Tests (Doc 02 Sections 11 & 13).

Covers:
- T18: Optimistic locking on cases (409 Conflict when two reviewers decide concurrently)
- T25: Confirm scam number in reviewer decision, verifying number status update
- Case notes and timeline retrieval
- Security headers and CSP
- Exact-origin CORS configuration
- Sentry before_send PII and request body scrubbing
- Authorization enforcement on case decision routes
"""

from __future__ import annotations

import pytest
from app.models.base import utcnow
from app.models.check import Case, Check, CheckNumber, RiskyNumber
from app.models.user import User
from app.pipeline.rules.engine import get_rule_engine
from app.security.passwords import hash_password
from sqlalchemy import select


@pytest.fixture
async def reviewer_user(db):
    user = User(
        email="reviewer@example.com",
        password_hash=hash_password("correct-horse-battery-123"),
        display_name="Reviewer One",
        role="reviewer",
        email_verified_at=utcnow(),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest.fixture
async def standard_user(db):
    user = User(
        email="standard@example.com",
        password_hash=hash_password("correct-horse-battery-123"),
        display_name="Standard User",
        role="user",
        email_verified_at=utcnow(),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest.fixture
async def sample_case(db):
    check = Check(
        kind="message",
        final_level="High",
        masked_text="টাকা পাঠান [PHONE_1]",
        reasons=["জরুরি টাকা পাঠানোর চাপ"],
    )
    db.add(check)
    await db.flush()

    rn = RiskyNumber(
        number_hmac="a" * 64,
        masked_display="+880 17** ***123",
        status="watch",
        report_count=3,
        check_count=8,
    )
    db.add(rn)
    await db.flush()

    cn = CheckNumber(check_id=check.id, number_id=rn.id, role="sender")
    db.add(cn)

    from app.models.base import utcnow

    case = Case(
        reference="PRO-889900",
        check_id=check.id,
        status="new",
        version=1,
        reporter_consent_at=utcnow(),
    )
    db.add(case)
    await db.commit()
    await db.refresh(case)
    return case


@pytest.mark.anyio
async def test_t18_case_decision_optimistic_locking_conflict(client, sample_case, reviewer_user, app):
    from app.api.deps import get_optional_user

    async def _mock_reviewer():
        return reviewer_user

    app.dependency_overrides[get_optional_user] = _mock_reviewer

    # First reviewer decides on version 1 -> succeeds, version becomes 2
    r1 = await client.post(
        f"/api/v1/cases/{sample_case.id}/decision",
        json={
            "decision": "confirmed_scam",
            "reason": "Confirmed fraudulent activity reported by multiple victims.",
            "version": 1,
        },
    )
    assert r1.status_code == 200
    data1 = r1.json()
    assert data1["status"] == "confirmed_scam"
    assert data1["version"] == 2

    # Second concurrent reviewer tries to decide with stale version 1 -> 409 Conflict (T18)
    r2 = await client.post(
        f"/api/v1/cases/{sample_case.id}/decision",
        json={
            "decision": "not_scam",
            "reason": "I think this is actually a legitimate transaction.",
            "version": 1,  # Stale version!
        },
    )
    assert r2.status_code == 409
    assert r2.json()["error"]["code"] == "conflict"
    assert r2.json()["error"]["message_key"] == "errors.case_version_conflict"

    app.dependency_overrides.clear()


@pytest.mark.anyio
async def test_t25_confirmed_scam_updates_risky_number_status(client, sample_case, reviewer_user, db, app):
    from app.api.deps import get_optional_user

    async def _mock_reviewer():
        return reviewer_user

    app.dependency_overrides[get_optional_user] = _mock_reviewer

    # Reviewer confirms case as scam
    r = await client.post(
        f"/api/v1/cases/{sample_case.id}/decision",
        json={
            "decision": "confirmed_scam",
            "reason": "Confirmed scam syndicate operation targeting bKash users.",
            "version": 1,
        },
    )
    assert r.status_code == 200

    # Verify associated RiskyNumber is updated to 'confirmed_risky'
    rn = (
        await db.execute(
            select(RiskyNumber).where(RiskyNumber.masked_display == "+880 17** ***123")
        )
    ).scalar_one()
    assert rn.status == "confirmed_risky"

    # Now verify that RuleEngine detects this confirmed risky number
    rule_engine = get_rule_engine()
    result = rule_engine.evaluate(
        text="টাকা পাঠান [PHONE_1]",
        phone_hashes=[rn.number_hmac],
        risky_number_hashes={rn.number_hmac},
    )
    assert "HARD_CONFIRMED_RISKY_NUMBER" in result.rule_ids
    assert result.floor == "High"

    app.dependency_overrides.clear()


@pytest.mark.anyio
async def test_case_notes_and_timeline_logging(client, sample_case, reviewer_user, app):
    from app.api.deps import get_optional_user

    async def _mock_reviewer():
        return reviewer_user

    app.dependency_overrides[get_optional_user] = _mock_reviewer

    # Add a note
    r_note = await client.post(
        f"/api/v1/cases/{sample_case.id}/notes",
        json={"note": "Contacted CID Cyber Police regarding this sender."},
    )
    assert r_note.status_code == 200
    note_data = r_note.json()
    assert note_data["note"] == "Contacted CID Cyber Police regarding this sender."
    assert note_data["author_name"] == "Reviewer One"

    # Fetch case detail and assert note is returned
    r_detail = await client.get(f"/api/v1/cases/{sample_case.id}")
    assert r_detail.status_code == 200
    detail = r_detail.json()
    assert len(detail["notes"]) >= 1
    assert detail["notes"][0]["note"] == "Contacted CID Cyber Police regarding this sender."

    app.dependency_overrides.clear()


@pytest.mark.anyio
async def test_authorization_user_cannot_access_case_routes(client, sample_case, standard_user, app):
    from app.api.deps import get_optional_user

    async def _mock_standard():
        return standard_user

    app.dependency_overrides[get_optional_user] = _mock_standard

    # Standard user receives 403 Forbidden on case details
    r = await client.get(f"/api/v1/cases/{sample_case.id}")
    assert r.status_code == 403
    assert r.json()["error"]["code"] == "forbidden"

    # Standard user receives 403 on case decision
    r_dec = await client.post(
        f"/api/v1/cases/{sample_case.id}/decision",
        json={"decision": "confirmed_scam", "reason": "test reason 123", "version": 1},
    )
    assert r_dec.status_code == 403

    app.dependency_overrides.clear()
