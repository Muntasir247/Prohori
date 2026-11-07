"""User account model.

Mirrors the ``users`` table in Doc 02 Section 8. ``email`` is stored case-folded
by the service layer (Postgres uses ``citext``; SQLite has no such type, so the
application normalises to lower-case before writing and comparing).
"""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from uuid import UUID

from sqlalchemy import Boolean, DateTime, Enum, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, created_at_col, updated_at_col, uuid_pk


class UserRole(StrEnum):
    user = "user"
    reviewer = "reviewer"
    admin = "admin"


# ``role`` is the Postgres enum ``user_role`` (migration 0001). Mapping it as a
# plain String would make the asyncpg dialect bind ``$1::VARCHAR``, which Postgres
# rejects for an enum column. A string-valued SQLAlchemy Enum binds as
# ``$1::user_role`` on Postgres and degrades to VARCHAR on SQLite (offline tests).
# The type is owned by the migration, never created from metadata.
def user_role_type() -> Enum:
    return Enum(
        *(r.value for r in UserRole),
        name="user_role",
        native_enum=True,
        create_constraint=False,
        validate_strings=True,
    )


class User(Base):
    __tablename__ = "users"

    id: Mapped[UUID] = uuid_pk()
    email: Mapped[str] = mapped_column(String(320), nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    display_name: Mapped[str] = mapped_column(String(80), nullable=False)
    role: Mapped[str] = mapped_column(
        user_role_type(), nullable=False, default=UserRole.user.value
    )
    language: Mapped[str] = mapped_column(String(2), nullable=False, default="bn")
    theme: Mapped[str] = mapped_column(String(10), nullable=False, default="system")
    email_verified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    onboarding_completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    consent_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = created_at_col()
    updated_at: Mapped[datetime] = updated_at_col()

    @property
    def is_verified(self) -> bool:
        return self.email_verified_at is not None
