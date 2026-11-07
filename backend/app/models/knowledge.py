"""Knowledge and reference data models (Doc 02 Section 8).

Portable cross-dialect models for safe actions, demo samples, and tips.
"""

from __future__ import annotations

from datetime import date

from sqlalchemy import Boolean, Date, Integer, SmallInteger, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class SafeAction(Base):
    __tablename__ = "safe_actions"

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
