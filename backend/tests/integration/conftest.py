"""Live-Postgres integration fixtures.

Runs the auth suites against a real PostgreSQL 16 whose schema comes from the
hand-written Alembic migrations (Doc 02 Section 8) — not from ORM metadata — so
type mismatches between the models and the real DDL (enums, citext, char(64),
jsonb, bigserial) surface here and not in production.

Opt-in: set ``PROHORI_TEST_PG_URL`` to an async URL for a server where the user
may create databases, e.g.::

    PROHORI_TEST_PG_URL=postgresql+asyncpg://prohori@localhost:5432/postgres

A throwaway database is created, migrated to head, and dropped afterwards.
Without the variable this whole directory is skipped.
"""

from __future__ import annotations

import asyncio
import os
import secrets
import subprocess
import sys
from pathlib import Path

import pytest
from sqlalchemy.engine import make_url

PG_URL = os.environ.get("PROHORI_TEST_PG_URL")

if not PG_URL:
    collect_ignore_glob = ["test_*.py"]

_BACKEND_DIR = Path(__file__).resolve().parents[2]
_TABLES = "users, sessions, auth_tokens, audit_events, rate_limit_counters"


def _asyncpg_dsn(url) -> str:
    return url.set(drivername="postgresql").render_as_string(hide_password=False)


async def _admin(sql: str) -> None:
    import asyncpg

    conn = await asyncpg.connect(_asyncpg_dsn(make_url(PG_URL)))
    try:
        await conn.execute(sql)
    finally:
        await conn.close()


@pytest.fixture(scope="session")
def pg_url():
    name = f"prohori_test_{secrets.token_hex(4)}"
    asyncio.run(_admin(f'CREATE DATABASE "{name}"'))
    url = make_url(PG_URL).set(database=name)
    rendered = url.render_as_string(hide_password=False)
    try:
        subprocess.run(
            [sys.executable, "-m", "alembic", "upgrade", "head"],
            cwd=_BACKEND_DIR,
            env={**os.environ, "DATABASE_URL": rendered},
            check=True,
            capture_output=True,
        )
        yield rendered
    finally:
        asyncio.run(_admin(f'DROP DATABASE IF EXISTS "{name}" WITH (FORCE)'))


@pytest.fixture
async def _engine(pg_url):
    """Overrides the root SQLite engine: same fixtures, real Postgres schema."""
    from sqlalchemy import text
    from sqlalchemy.ext.asyncio import create_async_engine
    from sqlalchemy.pool import NullPool

    engine = create_async_engine(pg_url, poolclass=NullPool)
    async with engine.begin() as conn:
        # TRUNCATE skips row-level triggers, so the append-only audit table can
        # still be reset between tests (UPDATE/DELETE on it are refused).
        await conn.execute(text(f"TRUNCATE {_TABLES} RESTART IDENTITY CASCADE"))
    yield engine
    await engine.dispose()
