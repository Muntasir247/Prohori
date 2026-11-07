"""Shared test fixtures.

Tests run fully offline: an in-memory SQLite database (shared across connections
via ``StaticPool``) stands in for Postgres, and required secrets are set to
throwaway values before anything imports ``app.config``. The auth tables are
created from ``Base.metadata`` — the hand-written Alembic migrations hold the
exact Postgres DDL and are exercised in Phase 03.
"""

from __future__ import annotations

import os

import pytest

# Set required env vars *before* anything imports app.config.
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("ANTHROPIC_API_KEY", "test-anthropic-key")
os.environ.setdefault("NUMBER_HMAC_KEY", "test-hmac-key")
os.environ.setdefault("SESSION_SECRET", "test-session-secret")
os.environ.setdefault("ENVIRONMENT", "test")


@pytest.fixture
def app():
    from app.config import get_settings
    from app.main import create_app

    get_settings.cache_clear()
    return create_app()


@pytest.fixture
async def _engine():
    from app.models import Base
    from sqlalchemy.ext.asyncio import create_async_engine
    from sqlalchemy.pool import StaticPool

    engine = create_async_engine(
        "sqlite+aiosqlite://",
        poolclass=StaticPool,
        connect_args={"check_same_thread": False},
        future=True,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest.fixture
def session_factory(_engine):
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

    return async_sessionmaker(_engine, expire_on_commit=False, class_=AsyncSession)


@pytest.fixture
async def db(session_factory):
    """A committing session for tests that read or tweak rows directly."""
    async with session_factory() as session:
        yield session
        await session.commit()


@pytest.fixture(autouse=True)
def _clear_email_outbox():
    from app.services.email import clear_outbox

    clear_outbox()
    yield
    clear_outbox()


@pytest.fixture
async def client(app, session_factory):
    import httpx
    from app.api.deps import get_db

    async def _override_get_db():
        async with session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_db] = _override_get_db

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://testserver",
        headers={"X-Requested-With": "prohori"},
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture
async def raw_client(app, session_factory):
    """A client WITHOUT the X-Requested-With header, for CSRF-rejection tests."""
    import httpx
    from app.api.deps import get_db

    async def _override_get_db():
        async with session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_db] = _override_get_db
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(
        transport=transport, base_url="http://testserver"
    ) as ac:
        yield ac
    app.dependency_overrides.clear()
