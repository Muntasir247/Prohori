"""Single-use auth tokens: email verification, password reset, reviewer invite.

Tokens are stored as SHA-256 hashes only, expire, and are consumed exactly once
(``used_at``). Doc 02 Section 7: verify 24h, reset 30m, invite 48h.
"""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, created_at_col, uuid_pk
from app.models.user import user_role_type


class TokenPurpose(StrEnum):
    verify_email = "verify_email"
    reset_password = "reset_password"
    invite = "invite"


class AuthToken(Base):
    __tablename__ = "auth_tokens"

    id: Mapped[UUID] = uuid_pk()
    user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=True
    )
    email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    purpose: Mapped[str] = mapped_column(String(20), nullable=False)
    role: Mapped[str | None] = mapped_column(user_role_type(), nullable=True)
    token_hash: Mapped[str] = mapped_column(
        String(64), nullable=False, unique=True
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    used_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = created_at_col()
