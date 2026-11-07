"""Append-only audit log.

Doc 02 Section 8 makes ``audit_events`` append-only with a Postgres trigger that
raises on UPDATE/DELETE. The ORM model here never issues updates; the immutability
guarantee itself lives in migration 0001 (Phase 03) and is proven in that phase's
tests. Security-relevant auth events (lockouts, role changes) are written here.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import JSON, BigInteger, DateTime, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, utcnow

# bigserial on Postgres; SQLite only autoincrements an INTEGER PRIMARY KEY.
_ID_TYPE = BigInteger().with_variant(Integer(), "sqlite")
# jsonb on Postgres (bind as jsonb, not json); plain JSON elsewhere.
_JSON_TYPE = JSON().with_variant(JSONB(), "postgresql")


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id: Mapped[int] = mapped_column(_ID_TYPE, primary_key=True, autoincrement=True)
    actor_id: Mapped[UUID | None] = mapped_column(nullable=True)
    actor_role: Mapped[str | None] = mapped_column(String(12), nullable=True)
    action: Mapped[str] = mapped_column(String(60), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(30), nullable=False)
    entity_id: Mapped[str] = mapped_column(String, nullable=False)
    before: Mapped[dict[str, Any] | None] = mapped_column(_JSON_TYPE, nullable=True)
    after: Mapped[dict[str, Any] | None] = mapped_column(_JSON_TYPE, nullable=True)
    request_id: Mapped[str | None] = mapped_column(String(40), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )
