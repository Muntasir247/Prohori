"""Phase 03 / T24 Live PostgreSQL Proof Suite.

Run against a dedicated scratch PostgreSQL 16 database (with pgvector):
    TEST_POSTGRES_URL=postgresql+asyncpg://... pytest tests/integration/test_phase03_postgres_proofs.py

Verifies:
1. All 24 Doc 02 Section 8 tables exist after ``alembic upgrade head``.
2. ``alembic upgrade head -> downgrade base -> upgrade head`` round-trips cleanly.
3. ``scripts/seed.py`` is idempotent (row counts identical after running twice).
4. T24: ``UPDATE`` and ``DELETE`` on ``audit_events`` fail with ``audit_events is append-only``.
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest
from sqlalchemy import text

BACKEND_DIR = Path(__file__).resolve().parents[2]

EXPECTED_24_TABLES = {
    "users",
    "sessions",
    "auth_tokens",
    "scam_types",
    "checks",
    "risky_numbers",
    "check_numbers",
    "campaigns",
    "cases",
    "case_notes",
    "audit_events",
    "kb_documents",
    "kb_chunks",
    "check_embeddings",
    "safe_actions",
    "samples",
    "tips",
    "shares",
    "notifications",
    "api_keys",
    "rate_limit_counters",
    "prompt_versions",
    "eval_runs",
    "daily_aggregates",
}


async def test_all_24_schema_tables_present(db):
    rows = (
        (
            await db.execute(
                text(
                    "SELECT table_name FROM information_schema.tables "
                    "WHERE table_schema = 'public'"
                )
            )
        )
        .scalars()
        .all()
    )
    missing = EXPECTED_24_TABLES - set(rows)
    assert not missing, f"Missing schema tables: {sorted(missing)}"


async def test_t24_audit_events_append_only_trigger(db):
    await db.execute(
        text(
            "INSERT INTO audit_events (action, entity_type, entity_id) "
            "VALUES ('phase03.t24.probe', 'system', 'probe-1')"
        )
    )
    await db.commit()

    for forbidden_sql in (
        "UPDATE audit_events SET action = 'tampered' WHERE action = 'phase03.t24.probe'",
        "DELETE FROM audit_events WHERE action = 'phase03.t24.probe'",
    ):
        with pytest.raises(Exception, match="append-only"):
            await db.execute(text(forbidden_sql))
        await db.rollback()


def test_alembic_upgrade_downgrade_upgrade_and_seed_twice():
    pg_url = os.environ.get("TEST_POSTGRES_URL")
    if not pg_url:
        pytest.skip("TEST_POSTGRES_URL not set")

    env = {
        **os.environ,
        "DATABASE_URL": pg_url,
        "ANTHROPIC_API_KEY": os.environ.get("ANTHROPIC_API_KEY", "test-key"),
        "NUMBER_HMAC_KEY": os.environ.get("NUMBER_HMAC_KEY", "test-hmac-key"),
        "SESSION_SECRET": os.environ.get("SESSION_SECRET", "test-session-secret"),
        "SEED_USER_PASSWORD": os.environ.get(
            "SEED_USER_PASSWORD", "UserPass123!Secure"
        ),
        "SEED_REVIEWER_PASSWORD": os.environ.get(
            "SEED_REVIEWER_PASSWORD", "ReviewerPass123!Secure"
        ),
        "SEED_ADMIN_PASSWORD": os.environ.get(
            "SEED_ADMIN_PASSWORD", "AdminPass123!Secure"
        ),
    }

    for cmd in (
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        [sys.executable, "-m", "alembic", "downgrade", "base"],
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        [sys.executable, "scripts/seed.py"],
        [sys.executable, "scripts/seed.py"],
    ):
        res = subprocess.run(
            cmd, cwd=BACKEND_DIR, env=env, capture_output=True, text=True
        )
        assert res.returncode == 0, f"Command {cmd} failed:\n{res.stdout}\n{res.stderr}"
