"""Knowledge and reference data models (Doc 02 Section 8).

Portable cross-dialect models for safe actions, demo samples, tips,
and knowledge base documents and chunks.
"""

from __future__ import annotations

from datetime import date, datetime
from uuid import UUID

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Date,
    ForeignKey,
    Integer,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.models.base import Base, created_at_col, updated_at_col, uuid_pk


class SafeAction(Base):
    __tablename__ = "safe_actions"
    __table_args__ = (
        CheckConstraint(
            "phone IS NULL OR is_active = false OR is_active = 0 "
            "OR (source_url IS NOT NULL AND verified_at IS NOT NULL)",
            name="phone_needs_source",
        ),
    )

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    label_en: Mapped[str] = mapped_column(String(160), nullable=False)
    label_bn: Mapped[str] = mapped_column(String(160), nullable=False)
    body_en: Mapped[str | None] = mapped_column(Text, nullable=True)
    body_bn: Mapped[str | None] = mapped_column(Text, nullable=True)
    context: Mapped[str] = mapped_column(
        String(16), nullable=False, default="before_payment"
    )  # "before_payment" | "after_payment" | "both"
    min_level: Mapped[str] = mapped_column(String(10), nullable=False, default="Low")
    provider: Mapped[str | None] = mapped_column(String(20), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    source_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    verified_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=100)


class Sample(Base):
    __tablename__ = "samples"

    id: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    label_en: Mapped[str] = mapped_column(String(60), nullable=False)
    label_bn: Mapped[str] = mapped_column(String(60), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    language: Mapped[str] = mapped_column(String(10), nullable=False)


class Tip(Base):
    __tablename__ = "tips"

    id: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    title_en: Mapped[str] = mapped_column(String(120), nullable=False)
    title_bn: Mapped[str] = mapped_column(String(120), nullable=False)
    body_en: Mapped[str] = mapped_column(Text, nullable=False)
    body_bn: Mapped[str] = mapped_column(Text, nullable=False)
    active_from: Mapped[date] = mapped_column(Date, nullable=False)


class KbDocument(Base):
    __tablename__ = "kb_documents"

    id: Mapped[UUID] = uuid_pk()
    code: Mapped[str] = mapped_column(String(12), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    scam_type_id: Mapped[int] = mapped_column(
        SmallInteger, ForeignKey("scam_types.id"), nullable=False
    )
    language: Mapped[str] = mapped_column(
        String(10), nullable=False
    )  # 'bn', 'en', 'banglish'
    source_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        String(12), nullable=False, default="draft"
    )  # 'draft', 'published', 'retired'
    created_by: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = created_at_col()
    updated_at: Mapped[datetime] = updated_at_col()

    scam_type = relationship("ScamType", lazy="joined")
    chunks = relationship(
        "KbChunk", back_populates="document", cascade="all, delete-orphan"
    )


_ID_TYPE = BigInteger().with_variant(Integer(), "sqlite")


class KbChunk(Base):
    __tablename__ = "kb_chunks"
    __table_args__ = (
        UniqueConstraint("document_id", "chunk_index", name="uq_document_chunk"),
    )

    id: Mapped[int] = mapped_column(_ID_TYPE, primary_key=True, autoincrement=True)
    document_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("kb_documents.id", ondelete="CASCADE"),
        nullable=False,
    )
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    token_count: Mapped[int] = mapped_column(Integer, nullable=False)
    embedding: Mapped[list[float] | None] = mapped_column(JSON, nullable=True)
    embedding_model: Mapped[str | None] = mapped_column(String(40), nullable=True)

    document = relationship("KbDocument", back_populates="chunks")
