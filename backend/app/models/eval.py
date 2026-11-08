"""Evaluation and Prompt Version models (Doc 02 Section 8, Section 10.7).

Tracks versioned LLM prompts and offline/simulated evaluation runs with quality gates.
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    Boolean,
    ForeignKey,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.models.base import Base, created_at_col


class PromptVersion(Base):
    __tablename__ = "prompt_versions"
    __table_args__ = (
        UniqueConstraint("name", "version", name="uq_prompt_name_version"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(40), nullable=False)
    version: Mapped[str] = mapped_column(String(20), nullable=False)
    body_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = created_at_col()

    eval_runs = relationship("EvalRun", back_populates="prompt_version")


class EvalRun(Base):
    __tablename__ = "eval_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    prompt_version_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("prompt_versions.id", ondelete="SET NULL"), nullable=True
    )
    dataset_version: Mapped[str] = mapped_column(String(20), nullable=False)
    item_count: Mapped[int] = mapped_column(Integer, nullable=False)
    high_precision: Mapped[Decimal | None] = mapped_column(Numeric(5, 4), nullable=True)
    high_recall: Mapped[Decimal | None] = mapped_column(Numeric(5, 4), nullable=True)
    genuine_high_rate: Mapped[Decimal | None] = mapped_column(
        Numeric(5, 4), nullable=True
    )
    unsafe_flags: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    report: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = created_at_col()

    prompt_version = relationship(
        "PromptVersion", back_populates="eval_runs", lazy="joined"
    )
