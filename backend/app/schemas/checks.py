"""Pydantic schemas for check and public endpoints (Doc 02 Section 9)."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class CheckMessageRequest(BaseModel):
    text: str = Field(..., min_length=10, max_length=4000)
    claimed_sender: str | None = Field(None, max_length=40)
    language_hint: str | None = Field(None, max_length=10)


class CheckPaymentRequest(BaseModel):
    amount_bdt: Decimal = Field(..., gt=0, le=10_000_000)
    recipient_status: str = Field(..., pattern="^(known|new|not_sure)$")
    recipient_number: str | None = Field(None, max_length=30)
    request_channel: str = Field(
        ..., pattern="^(phone_call|sms|whatsapp|in_person|online_shop|other)$"
    )
    rushed: str = Field(..., pattern="^(yes|no|not_sure)$")
    provider: str | None = Field(None, pattern="^(bkash|nagad|rocket|upay|other)$")
    local_hour: int | None = Field(None, ge=0, le=23)
    message_text: str | None = Field(None, max_length=4000)

    @field_validator("amount_bdt", mode="before")
    @classmethod
    def _parse_amount(cls, v: Any) -> Decimal:
        if isinstance(v, int | float | Decimal):
            return Decimal(str(v))
        if isinstance(v, str):
            from app.pipeline.normalize import parse_amount_bdt

            parsed = parse_amount_bdt(v)
            if parsed is not None:
                return parsed
            try:
                return Decimal(v)
            except Exception:
                pass
        raise ValueError("Invalid amount_bdt format")


class SafeActionItem(BaseModel):
    id: str
    label: str
    body: str | None = None
    phone: str | None = None


class HighlightItem(BaseModel):
    quote: str
    flag: str
    start: int
    end: int


class EvidenceItem(BaseModel):
    code: str
    title: str


class ScamTypeSummary(BaseModel):
    slug: str
    name: str


class CheckResultResponse(BaseModel):
    id: UUID
    final_level: str | None = None  # "High" | "Medium" | "Low" | None
    response_language: str = "bn"
    reasons: list[str] = Field(default_factory=list)
    red_flags: list[str] = Field(default_factory=list)
    highlights: list[HighlightItem] = Field(default_factory=list)
    safe_actions: list[SafeActionItem] = Field(default_factory=list)
    caution: str
    scam_type: ScamTypeSummary | None = None
    evidence: list[EvidenceItem] = Field(default_factory=list)
    masked_text: str | None = None
    is_fallback: bool = False
    trimmed: bool = False
    has_reported: bool = False
    report_reference: str | None = None
    created_at: datetime


class CheckHistoryItem(BaseModel):
    id: UUID
    kind: str
    final_level: str | None = None
    masked_text: str | None = None
    amount_bdt: Decimal | None = None
    scam_type: ScamTypeSummary | None = None
    has_reported: bool = False
    report_reference: str | None = None
    created_at: datetime


class CheckHistoryResponse(BaseModel):
    items: list[CheckHistoryItem]
    total: int
    cursor: str | None = None


class ReportCheckRequest(BaseModel):
    consent: bool
    note: str | None = Field(None, max_length=500)


class ReportCheckResponse(BaseModel):
    reference: str


class SafeActionResponse(BaseModel):
    id: str
    label_en: str
    label_bn: str
    body_en: str | None = None
    body_bn: str | None = None
    context: str
    min_level: str
    provider: str | None = None
    phone: str | None = None
    source_url: str | None = None
    verified_at: date | None = None
    is_active: bool


class SampleResponse(BaseModel):
    id: int
    label_en: str
    label_bn: str
    body: str
    language: str


class TipResponse(BaseModel):
    id: int
    title_en: str
    title_bn: str
    body_en: str
    body_bn: str
    active_from: date
