"""Unit and integration tests for Phase 09 Analytics, Repeat Numbers, and Campaigns.

Verifies:
1. Direct SQL fixture totals match API /analytics/overview exactly.
2. Nightly job is fully idempotent and deletes guest checks older than 30 days.
3. Reviewer decisions cause live chart series and KPIs to move immediately.
4. Repeat numbers listing and status PATCH require a reason and write to audit.
5. Campaigns listing, renaming, and merging.
6. CSV export is streaming, masked, UTF-8 with BOM, audited, and neutralizes formula injection.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from app.api.cookies import session_cookie_name
from app.jobs.nightly import run_nightly_job
from app.models.audit import AuditEvent
from app.models.base import utcnow
from app.models.check import (
    Campaign,
    Case,
    Check,
    CheckNumber,
    DailyAggregate,
    RiskyNumber,
    ScamType,
)
from app.models.session import Session as UserSession
from app.models.user import User, UserRole
from app.security.tokens import hash_token, new_token
from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.fixture
async def reviewer_client(
    client: AsyncClient, db: AsyncSession
) -> tuple[AsyncClient, User]:
    """Create a reviewer user and log them in via the standard login endpoint."""
    from app.security.passwords import hash_password
    from tests.helpers import login

    email = f"reviewer-{uuid4().hex[:8]}@prohori.local"
    pw = "staff-strong-password"
    user = User(
        email=email,
        password_hash=hash_password(pw),
        display_name="Senior Reviewer",
        role=UserRole.reviewer.value,
        email_verified_at=utcnow(),
    )
    db.add(user)
    await db.commit()

    login_res = await login(client, email, pw)
    assert login_res.status_code == 200

    return client, user


@pytest.fixture
async def seeded_fixtures(db: AsyncSession) -> dict[str, list]:
    """Seed test database with scam types, numbers, checks, and cases."""
    print("--> INSIDE SEEDED FIXTURES", flush=True)
    now = utcnow()
    yesterday = now - timedelta(days=1)
    two_days_ago = now - timedelta(days=2)
    old_guest_date = now - timedelta(days=35)

    # 1. Scam types
    st1 = ScamType(
        id=1,
        slug="fake_wallet_staff",
        name_en="Fake Wallet Staff",
        name_bn="নকল ওয়ালেট স্টাফ",
    )
    st2 = ScamType(
        id=2,
        slug="lottery_prize",
        name_en="Lottery Prize Scam",
        name_bn="লটারি পুরস্কার প্রতারণা",
    )
    db.add_all([st1, st2])
    await db.commit()

    # 2. Risky numbers
    n1 = RiskyNumber(
        number_hmac="hmac_num_111",
        masked_display="+880 17** ***111",
        check_count=3,
        report_count=2,
        high_count=2,
        status="watch",
    )
    n2 = RiskyNumber(
        number_hmac="hmac_num_222",
        masked_display="+880 18** ***222",
        check_count=1,
        report_count=1,
        high_count=1,
        status="watch",
    )
    db.add_all([n1, n2])
    await db.commit()

    # 3. Campaign
    camp = Campaign(
        label="OTP Harvest Ring",
        scam_type_id=st1.id,
        member_count=2,
        count_7d=12,
        prev_count_7d=4,
        is_surging=True,
    )
    db.add(camp)
    await db.commit()

    # 4. Checks
    c1 = Check(
        kind="message",
        final_level="High",
        scam_type_id=st1.id,
        masked_text="আপনার পিন দিন [PHONE_1]",
        created_at=two_days_ago,
    )
    c2 = Check(
        kind="message",
        final_level="High",
        scam_type_id=st1.id,
        masked_text="জরুরি কোড পাঠান [PHONE_1]",
        created_at=yesterday,
    )
    c3 = Check(
        kind="message",
        final_level="Medium",
        scam_type_id=st2.id,
        masked_text="লটারি জিতেছেন যোগাযোগ করুন [PHONE_2]",
        created_at=now,
    )
    c4_high_today = Check(
        kind="message",
        final_level="High",
        scam_type_id=st1.id,
        masked_text="আজকের নতুন জালিয়াতি বার্তা",
        created_at=now,
    )
    # Old unreported guest check (should be purged by nightly job)
    c_old_guest = Check(
        kind="message",
        user_id=None,
        final_level="Low",
        masked_text="পুরনো গেস্ট চেক",
        created_at=old_guest_date,
    )
    db.add_all([c1, c2, c3, c4_high_today, c_old_guest])
    await db.commit()

    # 5. Check numbers links
    cn1 = CheckNumber(check_id=c1.id, number_id=n1.id, role="sender")
    cn2 = CheckNumber(check_id=c2.id, number_id=n1.id, role="sender")
    cn3 = CheckNumber(check_id=c3.id, number_id=n2.id, role="sender")
    db.add_all([cn1, cn2, cn3])
    await db.commit()

    # 6. Cases
    case1 = Case(
        reference="PRO-100001",
        check_id=c1.id,
        status="confirmed_scam",
        campaign_id=camp.id,
        scam_type_id=st1.id,
        reporter_consent_at=two_days_ago,
        decided_at=two_days_ago + timedelta(minutes=15),
        decision_reason="Verified OTP fishing fraud",
        created_at=two_days_ago,
    )
    case2 = Case(
        reference="PRO-100002",
        check_id=c2.id,
        status="new",
        campaign_id=camp.id,
        scam_type_id=st1.id,
        reporter_consent_at=yesterday,
        created_at=yesterday,
    )
    case3 = Case(
        reference="PRO-100003",
        check_id=c3.id,
        status="in_review",
        scam_type_id=st2.id,
        reporter_consent_at=now,
        created_at=now,
    )
    db.add_all([case1, case2, case3])
    await db.commit()

    return {
        "scam_types": [st1, st2],
        "numbers": [n1, n2],
        "campaigns": [camp],
        "checks": [c1, c2, c3, c4_high_today, c_old_guest],
        "cases": [case1, case2, case3],
    }


async def test_nightly_job_is_idempotent_and_cleans_old_guest_checks(
    db: AsyncSession, seeded_fixtures: dict[str, list]
):
    """Test that jobs/nightly.py runs cleanly, purges old guest checks, and is 100% idempotent."""
    print("--> INSIDE TEST NIGHTLY JOB", flush=True)
    checks = seeded_fixtures["checks"]
    old_guest_id = checks[4].id

    # 1. First run of nightly job
    res1 = await run_nightly_job(session=db)
    assert res1["risky_numbers_recounted"] >= 2
    assert res1["unreported_guests_deleted"] >= 1

    # Verify old guest check was deleted
    deleted_check = await db.get(Check, old_guest_id)
    assert deleted_check is None

    # Verify risky_numbers counts were accurately recounted
    num1 = await db.get(RiskyNumber, seeded_fixtures["numbers"][0].id)
    assert num1.check_count == 2
    assert num1.report_count == 2
    assert num1.high_count == 2

    # Verify daily_aggregates were built for past days
    aggregates1 = (await db.scalars(select(DailyAggregate))).all()
    assert len(aggregates1) > 0

    # 2. Second run of nightly job on same state to prove IDEMPOTENCY
    res2 = await run_nightly_job(session=db)
    assert res2["unreported_guests_deleted"] == 0  # Already deleted

    aggregates2 = (await db.scalars(select(DailyAggregate))).all()
    assert len(aggregates1) == len(aggregates2)

    # Number counts remained identical
    num1_again = await db.get(RiskyNumber, seeded_fixtures["numbers"][0].id)
    assert num1_again.check_count == num1.check_count
    assert num1_again.report_count == num1.report_count
    assert num1_again.high_count == num1.high_count


async def test_analytics_overview_totals_match_direct_sql(
    reviewer_client: tuple[AsyncClient, User],
    db: AsyncSession,
    seeded_fixtures: dict[str, list],
):
    """Verify that GET /analytics/overview KPI totals match direct SQL queries exactly."""
    client, reviewer = reviewer_client

    # Direct SQL counts
    open_cases_sql = (
        await db.execute(
            select(func.count(Case.id)).where(Case.status.in_(["new", "in_review"]))
        )
    ).scalar()

    now = utcnow()
    today_start = datetime(now.year, now.month, now.day, tzinfo=UTC)
    high_today_sql = (
        await db.execute(
            select(func.count(Check.id)).where(
                Check.created_at >= today_start, Check.final_level == "High"
            )
        )
    ).scalar()

    # Call API
    res = await client.get("/api/v1/analytics/overview?days=7")
    assert res.status_code == 200
    data = res.json()

    kpis = data["kpis"]
    assert kpis["open_cases"] == open_cases_sql
    assert kpis["high_today"] == high_today_sql
    assert (
        kpis["reviewer_agreement"] == 1.0
    )  # case1 was High and confirmed_scam -> 100% agreement

    # Check that series match
    cases_by_risk = data["cases_by_risk"]
    assert len(cases_by_risk) == 7
    total_high_series = sum(item["High"] for item in cases_by_risk)
    assert total_high_series >= 2

    # Radar contains surging campaign
    assert len(data["surging_campaigns"]) >= 1
    assert data["surging_campaigns"][0]["label"] == "OTP Harvest Ring"


async def test_charts_move_after_decision(
    reviewer_client: tuple[AsyncClient, User],
    db: AsyncSession,
    seeded_fixtures: dict[str, list],
):
    """Verify that making a decision moves the live decisions chart and changes open cases."""
    client, reviewer = reviewer_client

    # Initial overview
    res1 = await client.get("/api/v1/analytics/overview?days=7")
    assert res1.status_code == 200
    init_open = res1.json()["kpis"]["open_cases"]
    today_iso = utcnow().date().isoformat()
    init_decisions_today = next(
        d for d in res1.json()["reviewer_decisions"] if d["date"] == today_iso
    )
    init_scam_count = init_decisions_today["confirmed_scam"]

    # Now make a decision on case3 (which was in_review)
    case3 = seeded_fixtures["cases"][2]
    c3_db = await db.get(Case, case3.id)
    c3_db.status = "confirmed_scam"
    c3_db.decided_at = utcnow()
    c3_db.decided_by = reviewer.id
    c3_db.decision_reason = "Verified lottery advance-fee fraud"
    await db.commit()

    # Query overview again
    res2 = await client.get("/api/v1/analytics/overview?days=7")
    assert res2.status_code == 200
    new_open = res2.json()["kpis"]["open_cases"]
    new_decisions_today = next(
        d for d in res2.json()["reviewer_decisions"] if d["date"] == today_iso
    )
    new_scam_count = new_decisions_today["confirmed_scam"]

    # Assert charts and KPIs moved!
    assert new_open == init_open - 1
    assert new_scam_count == init_scam_count + 1


async def test_repeat_numbers_and_patch_status_audit(
    reviewer_client: tuple[AsyncClient, User],
    db: AsyncSession,
    seeded_fixtures: dict[str, list],
):
    """Verify repeat numbers listing and status update with mandatory reason and audit event."""
    client, reviewer = reviewer_client

    res = await client.get("/api/v1/analytics/numbers")
    assert res.status_code == 200
    body = res.json()
    assert body["total"] >= 2
    item0 = body["items"][0]
    assert item0["masked_display"].startswith("+880 ")
    assert "history_30d" in item0
    assert len(item0["history_30d"]) == 30

    num_id = item0["id"]

    # 1. PATCH without valid reason or short reason -> 422
    fail_res = await client.patch(
        f"/api/v1/analytics/numbers/{num_id}",
        json={"status": "confirmed_risky", "reason": "short"},
    )
    assert fail_res.status_code == 422

    # 2. PATCH with valid status and 10+ char reason -> 200
    success_res = await client.patch(
        f"/api/v1/analytics/numbers/{num_id}",
        json={
            "status": "confirmed_risky",
            "reason": "Confirmed repeat scam number across multiple cases",
        },
    )
    assert success_res.status_code == 200
    assert success_res.json()["status"] == "confirmed_risky"

    # Verify audit event was recorded in DB
    audit_evt = (
        await db.scalars(
            select(AuditEvent)
            .where(
                AuditEvent.entity_type == "risky_number",
                AuditEvent.entity_id == str(num_id),
            )
            .order_by(AuditEvent.id.desc())
        )
    ).first()
    assert audit_evt is not None
    assert audit_evt.action == "risky_number.status_change"
    assert audit_evt.actor_id == reviewer.id
    assert audit_evt.before["status"] == "watch"
    assert audit_evt.after["status"] == "confirmed_risky"
    assert "reason" in audit_evt.after


async def test_campaigns_list_and_patch(
    reviewer_client: tuple[AsyncClient, User],
    db: AsyncSession,
    seeded_fixtures: dict[str, list],
):
    """Verify campaign listing, rename, and merge."""
    client, reviewer = reviewer_client
    camp = seeded_fixtures["campaigns"][0]

    # Create second campaign for merge test
    camp2 = Campaign(
        label="Second Suspicious Ring",
        scam_type_id=1,
        member_count=1,
    )
    db.add(camp2)
    await db.commit()

    # List campaigns
    res = await client.get("/api/v1/campaigns")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 2
    assert any(c["id"] == str(camp.id) for c in data["items"])

    # 1. Rename campaign
    rename_res = await client.patch(
        f"/api/v1/campaigns/{camp.id}",
        json={"label": "Renamed OTP Syndicate"},
    )
    assert rename_res.status_code == 200
    assert rename_res.json()["label"] == "Renamed OTP Syndicate"

    # 2. Merge campaign 2 into campaign 1
    merge_res = await client.patch(
        f"/api/v1/campaigns/{camp2.id}",
        json={"merge_into": str(camp.id)},
    )
    assert merge_res.status_code == 200
    assert merge_res.json()["id"] == str(camp.id)

    # Camp2 should be gone
    deleted_camp2 = await db.get(Campaign, camp2.id)
    assert deleted_camp2 is None


async def test_cases_csv_export_streaming_bom_and_injection_defense(
    reviewer_client: tuple[AsyncClient, User],
    db: AsyncSession,
    seeded_fixtures: dict[str, list],
):
    """Verify streaming CSV export, BOM header, Excel Bangla support, and formula escaping."""
    client, reviewer = reviewer_client

    # Add a case with formula injection attempt
    c_malicious = Check(
        kind="message",
        final_level="High",
        masked_text="@http://evil.com/phish",
        created_at=utcnow(),
    )
    db.add(c_malicious)
    await db.commit()

    case_malicious = Case(
        reference="=PRO-CALC",
        check_id=c_malicious.id,
        status="new",
        reporter_note="+SUM(1,2)",
        decision_reason="-1000 CMD",
        reporter_consent_at=utcnow(),
        created_at=utcnow(),
    )
    db.add(case_malicious)
    await db.commit()

    now = utcnow()
    from_iso = (now - timedelta(days=7)).date().isoformat()
    to_iso = now.date().isoformat()

    # 1. Valid export request
    res = await client.get(f"/api/v1/cases/export.csv?from={from_iso}&to={to_iso}")
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    assert "attachment" in res.headers["content-disposition"]

    content = res.content
    # Starts with UTF-8 BOM \xef\xbb\xbf
    assert content.startswith(b"\xef\xbb\xbf")

    # Decode and check lines
    csv_text = content.decode("utf-8")
    assert "Reference,Created At,Status" in csv_text

    # CSV injection defense: cells starting with =, +, -, @ must be escaped with a single quote '
    assert "'=PRO-CALC" in csv_text
    assert "'+SUM(1,2)" in csv_text
    assert "'-1000 CMD" in csv_text
    assert "'@http://evil.com/phish" in csv_text

    # Verify audit event for export was created
    audit_evt = (
        await db.scalars(
            select(AuditEvent)
            .where(
                AuditEvent.entity_type == "case",
                AuditEvent.action == "cases.export",
            )
            .order_by(AuditEvent.id.desc())
        )
    ).first()
    assert audit_evt is not None
    assert audit_evt.actor_id == reviewer.id

    # 2. Range exceeding 366 days -> 422
    too_wide_from = (now - timedelta(days=400)).date().isoformat()
    err_res = await client.get(
        f"/api/v1/cases/export.csv?from={too_wide_from}&to={to_iso}"
    )
    assert err_res.status_code == 422
