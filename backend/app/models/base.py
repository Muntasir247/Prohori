"""Declarative base and portable column helpers.

The production database is PostgreSQL (Doc 02 Section 8), but the test suite runs
against in-memory SQLite (``tests/conftest.py``). These models are therefore
written with cross-dialect types so ``Base.metadata.create_all`` works on SQLite
while the hand-written Alembic migrations hold the exact Postgres DDL. Defaults
are generated Python-side (``uuid4``, ``now``) rather than with Postgres
functions like ``gen_random_uuid()`` so table creation is portable.
"""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, Uuid
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def utcnow() -> datetime:
    """Timezone-aware current time (UTC). Used for Python-side defaults."""
    return datetime.now(UTC)


class Base(DeclarativeBase):
    """Shared declarative base for every ORM model."""


def uuid_pk() -> Mapped[UUID]:
    """A UUID primary key column with a Python-generated default."""
    return mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)


def created_at_col() -> Mapped[datetime]:
    return mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )


def updated_at_col() -> Mapped[datetime]:
    return mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow
    )
