"""Tests for F22/S23 Notifications and PATCH /api/v1/cases/{id} assignment."""

from __future__ import annotations

import pytest
from app.models.audit import AuditEvent
from app.models.base import utcnow
from app.models.check import Case, Check
from app.models.user import User
from app.security.passwords import hash_password
from sqlalchemy import select

CSRF = {"X-Requested-With": "prohori"}


@pytest.fixture
async def reporter_user(db):
    user = User(
        email="reporter@example.com",
        password_hash=hash_password("correct-horse-battery-123"),
        display_name="Reporter User",
        role="user",
        email_verified_at=utcnow(),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest.fixture
async def reviewer_user(db):
    user = User(
        email="reviewer2@example.com",
        password_hash=hash_password("correct-horse-battery-123"),
        display_name="Reviewer Two",
        role="reviewer",
        email_verified_at=utcnow(),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest.fixture
async def reported_case(db, reporter_user):
    check = Check(
        user_id=reporter_user.id,
        kind="message",
        final_level="High",
        masked_text="আপনার ওটিপি দিন [PHONE_1]",
        reasons=["ওটিপি চাওয়া হয়েছে"],
    )
    db.add(check)
    await db.flush()

    case = Case(
        reference="PRO-554433",
        check_id=check.id,
        status="new",
        version=1,
        reporter_consent_at=utcnow(),
    )
    db.add(case)
    await db.commit()
    await db.refresh(case)
    return case


async def _login(client, email: str):
    res = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "correct-horse-battery-123"},
        headers=CSRF,
    )
    assert res.status_code == 200


@pytest.mark.asyncio
async def test_patch_case_assign_unassign_conflict_and_audit(
    client, db, reviewer_user, reporter_user, reported_case
):
    # Normal user forbidden
    await _login(client, reporter_user.email)
    forbidden = await client.patch(
        f"/api/v1/cases/{reported_case.id}",
        json={"assigned_to": str(reviewer_user.id), "version": 1},
        headers=CSRF,
    )
    assert forbidden.status_code == 403

    # Reviewer claims case -> moves new -> in_review, increments version
    await _login(client, reviewer_user.email)
    claimed = await client.patch(
        f"/api/v1/cases/{reported_case.id}",
        json={"assigned_to": str(reviewer_user.id), "version": 1},
        headers=CSRF,
    )
    assert claimed.status_code == 200
    body = claimed.json()
    assert body["assigned_to"] == str(reviewer_user.id)
    assert body["assigned_to_name"] == "Reviewer Two"
    assert body["status"] == "in_review"
    assert body["version"] == 2

    # Stale version returns 409 stale_version
    stale = await client.patch(
        f"/api/v1/cases/{reported_case.id}",
        json={"status": "escalated", "version": 1},
        headers=CSRF,
    )
    assert stale.status_code == 409
    assert stale.json()["error"]["code"] == "stale_version"

    # Non-reviewer assignee rejected with 422
    bad_assignee = await client.patch(
        f"/api/v1/cases/{reported_case.id}",
        json={"assigned_to": str(reporter_user.id), "version": 2},
        headers=CSRF,
    )
    assert bad_assignee.status_code == 422

    # Unassign succeeds with current version
    unassigned = await client.patch(
        f"/api/v1/cases/{reported_case.id}",
        json={"assigned_to": None, "version": 2},
        headers=CSRF,
    )
    assert unassigned.status_code == 200
    assert unassigned.json()["assigned_to"] is None
    assert unassigned.json()["version"] == 3

    # Audit events recorded
    audits = (
        (
            await db.execute(
                select(AuditEvent).where(
                    AuditEvent.entity_id == str(reported_case.id),
                    AuditEvent.action == "case.update",
                )
            )
        )
        .scalars()
        .all()
    )
    assert len(audits) == 2


@pytest.mark.asyncio
async def test_notifications_lifecycle_on_case_decision(
    client, reviewer_user, reporter_user, reported_case
):
    # Unauthenticated returns 401
    unauth = await client.get("/api/v1/notifications")
    assert unauth.status_code == 401

    # Reviewer decides the reporter's case
    await _login(client, reviewer_user.email)
    dec = await client.post(
        f"/api/v1/cases/{reported_case.id}/decision",
        json={
            "decision": "confirmed_scam",
            "reason": "Confirmed fake bKash OTP request from reported case.",
            "version": 1,
        },
        headers=CSRF,
    )
    assert dec.status_code == 200

    # Reporter sees 1 unread case_decided notification
    await _login(client, reporter_user.email)
    listed = await client.get("/api/v1/notifications?unread=true")
    assert listed.status_code == 200
    data = listed.json()
    assert data["unread_count"] == 1
    assert len(data["items"]) == 1
    notif = data["items"][0]
    assert notif["type"] == "case_decided"
    assert notif["payload"]["reference"] == "PRO-554433"
    assert notif["payload"]["status"] == "confirmed_scam"
    assert notif["read_at"] is None

    # Empty read payload rejected with 422
    bad_read = await client.post(
        "/api/v1/notifications/read", json={}, headers=CSRF
    )
    assert bad_read.status_code == 422

    # Mark specific notification read
    mark = await client.post(
        "/api/v1/notifications/read",
        json={"ids": [notif["id"]]},
        headers=CSRF,
    )
    assert mark.status_code == 204

    # Unread list now empty, all list still has 1 read item
    unread_after = await client.get("/api/v1/notifications?unread=true")
    assert unread_after.json()["unread_count"] == 0
    assert unread_after.json()["items"] == []

    all_after = await client.get("/api/v1/notifications")
    assert len(all_after.json()["items"]) == 1
    assert all_after.json()["items"][0]["read_at"] is not None
