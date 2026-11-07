"""Alembic migration environment.

Uses the async engine built from ``app.config.Settings`` so migrations and the
app share one source of truth for the database URL. Schema migrations (the 24
tables of Doc 02 Section 8) land in ``alembic/versions`` from Phase 03.
"""

from __future__ import annotations

import asyncio
from logging.config import fileConfig

from alembic import context
from app.config import get_settings
from sqlalchemy.ext.asyncio import create_async_engine

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# ORM metadata for autogenerate. Models accrete across phases (Phase 04 adds the
# authentication tables). The hand-written migrations remain the source of truth
# for the exact Postgres DDL in Doc 02 Section 8.
from app.models import Base  # noqa: E402

target_metadata = Base.metadata


def _url() -> str:
    return get_settings().database_url


def run_migrations_offline() -> None:
    context.configure(
        url=_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def _do_run_migrations(connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    engine = create_async_engine(_url(), future=True)
    async with engine.connect() as connection:
        await connection.run_sync(_do_run_migrations)
    await engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
