"""The full auth suite, re-collected against live Postgres.

Every test in ``test_auth``, ``test_auth_security`` and ``test_me`` runs again
here with the ``_engine`` fixture from ``integration/conftest.py`` — a database
built by ``alembic upgrade head`` — plus Postgres-only checks below.
"""

from __future__ import annotations

import pytest
from sqlalchemy import text

from tests.helpers import register_verified
from tests.test_auth import *  # noqa: F403
from tests.test_auth_security import *  # noqa: F403
from tests.test_me import *  # noqa: F403


async def test_role_is_stored_as_the_user_role_enum(client, db):
    await register_verified(client, email="enum@example.com")
    row = (
        await db.execute(
            text(
                "SELECT pg_typeof(role)::text, role::text FROM users WHERE email = :e"
            ),
            {"e": "ENUM@example.com"},  # citext: case-insensitive match
        )
    ).one()
    assert row == ("user_role", "user")


async def test_audit_events_reject_update_and_delete(db):
    await db.execute(
        text(
            "INSERT INTO audit_events (action, entity_type, entity_id) "
            "VALUES ('probe', 'user', '1')"
        )
    )
    await db.commit()
    for stmt in ("UPDATE audit_events SET action = 'x'", "DELETE FROM audit_events"):
        with pytest.raises(Exception, match="append-only"):
            await db.execute(text(stmt))
        await db.rollback()
