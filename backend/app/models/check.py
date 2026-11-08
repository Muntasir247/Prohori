"""Check, case, and risky number models (Doc 02 Section 8).

Portable cross-dialect models using SQLAlchemy 2.0.
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    SmallInteger,
    String,
    Text,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.models.base import Base, created_at_col, updated_at_col, uuid_pk


class ScamType(Base):
    __tablename__ = "scam_types"

    id: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    slug: Mapped[str] = mapped_column(String(40), unique=True, nullable=False)
    name_en: Mapped[str] = mapped_column(String(80), nullable=False)
    name_bn: Mapped[str] = mapped_column(String(80), nullable=False)
    description_en: Mapped[str | None] = mapped_column(Text, nullable=True)
    description_bn: Mapped[str | None] = mapped_column(Text, nullable=True)
    severity: Mapped[str] = mapped_column(String(10), nullable=False, default="Medium")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class RiskyNumber(Base):
    __tablename__ = "risky_numbers"

    id: Mapped[UUID] = uuid_pk()
    number_hmac: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    masked_display: Mapped[str] = mapped_column(String(24), nullable=False)
    check_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    report_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    high_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="watch")
    first_seen_at: Mapped[datetime] = created_at_col()
    last_seen_at: Mapped[datetime] = created_at_col()


class Campaign(Base):
    __tablename__ = "campaigns"

    id: Mapped[UUID] = uuid_pk()
    label: Mapped[str] = mapped_column(String(120), nullable=False)
    scam_type_id: Mapped[int | None] = mapped_column(
        SmallInteger, ForeignKey("scam_types.id"), nullable=True
    )
    member_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    count_7d: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    prev_count_7d: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_surging: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    first_seen_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_seen_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    updated_at: Mapped[datetime] = updated_at_col()

    scam_type = relationship("ScamType", lazy="joined")
    cases = relationship("Case", back_populates="campaign")


class DailyAggregate(Base):
    __tablename__ = "daily_aggregates"

    day: Mapped[date] = mapped_column(Date, primary_key=True)
    risk_level: Mapped[str] = mapped_column(String(10), primary_key=True)
    scam_type_id: Mapped[int] = mapped_column(SmallInteger, primary_key=True, default=0)
    check_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    case_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    decided_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    agreed_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class CheckEmbedding(Base):
    __tablename__ = "check_embeddings"

    check_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("checks.id", ondelete="CASCADE"),
        primary_key=True,
    )
    embedding: Mapped[list[float]] = mapped_column(JSON, nullable=False)

    check = relationship("Check", lazy="joined")


class Check(Base):
    __tablename__ = "checks"

    id: Mapped[UUID] = uuid_pk()
    user_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    guest_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    api_key_id: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)
    kind: Mapped[str] = mapped_column(String(10), nullable=False)
    masked_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    text_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    trimmed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    detected_lang: Mapped[str | None] = mapped_column(String(10), nullable=True)
    response_lang: Mapped[str] = mapped_column(String(2), nullable=False, default="bn")
    claimed_sender: Mapped[str | None] = mapped_column(String(40), nullable=True)
    amount_bdt: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    recipient_status: Mapped[str | None] = mapped_column(String(10), nullable=True)
    request_channel: Mapped[str | None] = mapped_column(String(20), nullable=True)
    rushed: Mapped[str | None] = mapped_column(String(10), nullable=True)
    provider: Mapped[str | None] = mapped_column(String(20), nullable=True)
    local_hour: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)

    extracted: Mapped[dict[str, Any]] = mapped_column(
        JSON, nullable=False, default=dict
    )
    rule_hits: Mapped[list[Any]] = mapped_column(JSON, nullable=False, default=list)
    rule_level: Mapped[str | None] = mapped_column(String(10), nullable=True)
    llm_level: Mapped[str | None] = mapped_column(String(10), nullable=True)
    model_prob: Mapped[Decimal | None] = mapped_column(Numeric(5, 4), nullable=True)
    final_level: Mapped[str | None] = mapped_column(String(10), nullable=True)
    reasons: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    red_flags: Mapped[list[Any]] = mapped_column(JSON, nullable=False, default=list)
    highlights: Mapped[list[Any]] = mapped_column(JSON, nullable=False, default=list)
    safe_action_ids: Mapped[list[str]] = mapped_column(
        JSON, nullable=False, default=list
    )
    scam_type_id: Mapped[int | None] = mapped_column(
        SmallInteger, ForeignKey("scam_types.id"), nullable=True
    )
    retrieved_chunk_ids: Mapped[list[int]] = mapped_column(
        JSON, nullable=False, default=list
    )
    route: Mapped[str] = mapped_column(String(20), nullable=False, default="rules_only")
    is_fallback: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    prompt_version: Mapped[str | None] = mapped_column(String(20), nullable=True)
    model_name: Mapped[str | None] = mapped_column(String(40), nullable=True)
    risk_model_version: Mapped[str | None] = mapped_column(String(20), nullable=True)
    input_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    output_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cache_read_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    pause_outcome: Mapped[str | None] = mapped_column(String(10), nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = created_at_col()

    scam_type = relationship("ScamType", lazy="joined")
    numbers = relationship(
        "CheckNumber", back_populates="check", cascade="all, delete-orphan"
    )


class CheckNumber(Base):
    __tablename__ = "check_numbers"

    check_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("checks.id", ondelete="CASCADE"),
        primary_key=True,
    )
    number_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("risky_numbers.id"), primary_key=True
    )
    role: Mapped[str] = mapped_column(String(12), primary_key=True)

    check = relationship("Check", back_populates="numbers")
    risky_number = relationship("RiskyNumber", lazy="joined")


class Case(Base):
    __tablename__ = "cases"

    id: Mapped[UUID] = uuid_pk()
    reference: Mapped[str] = mapped_column(String(12), unique=True, nullable=False)
    check_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("checks.id"), unique=True, nullable=False
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="new")
    assigned_to: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    reporter_note: Mapped[str | None] = mapped_column(String(500), nullable=True)
    reporter_consent_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    scam_type_id: Mapped[int | None] = mapped_column(
        SmallInteger, ForeignKey("scam_types.id"), nullable=True
    )
    campaign_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("campaigns.id", ondelete="SET NULL"),
        nullable=True,
    )
    decided_by: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    decided_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    decision_reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_at: Mapped[datetime] = created_at_col()
    updated_at: Mapped[datetime] = updated_at_col()

    check = relationship("Check", lazy="joined")
    scam_type = relationship("ScamType", lazy="joined")
    campaign = relationship("Campaign", back_populates="cases")
    notes = relationship(
        "CaseNote",
        back_populates="case",
        cascade="all, delete-orphan",
        order_by="desc(CaseNote.created_at)",
    )


class CaseNote(Base):
    __tablename__ = "case_notes"

    id: Mapped[UUID] = uuid_pk()
    case_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False
    )
    author_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    note: Mapped[str] = mapped_column(String(2000), nullable=False)
    created_at: Mapped[datetime] = created_at_col()

    case = relationship("Case", back_populates="notes")
    author = relationship("User", lazy="joined")


class Share(Base):
    __tablename__ = "shares"

    id: Mapped[UUID] = uuid_pk()
    check_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("checks.id", ondelete="CASCADE"), nullable=False
    )
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    revoked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = created_at_col()

    check = relationship("Check", lazy="joined")
