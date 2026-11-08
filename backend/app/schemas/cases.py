"""Cases schemas (Doc 02 Section 9, Doc 01 S26)."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field


class ScamTypeSummary(BaseModel):
    id: int
    slug: str
    name_en: str
    name_bn: str


class CaseSummary(BaseModel):
    id: UUID
    reference: str
    status: str
    check_id: UUID
    risk_level: str | None = None
    scam_type: ScamTypeSummary | None = None
    reporter_note: str | None = None
    masked_text: str | None = None
    created_at: datetime
    decided_at: datetime | None = None
    assigned_to: UUID | None = None
    version: int


class CaseListResponse(BaseModel):
    items: list[CaseSummary]
    total: int
    page: int
    page_size: int


class CaseNoteOut(BaseModel):
    id: UUID
    case_id: UUID
    author_id: UUID | None
    author_name: str | None = None
    note: str
    created_at: datetime


class CaseNoteIn(BaseModel):
    note: str = Field(..., min_length=1, max_length=2000)


class CaseDecisionIn(BaseModel):
    decision: Literal["confirmed_scam", "not_scam", "escalated", "closed"]
    reason: str = Field(..., min_length=10, max_length=500)
    version: int
    scam_type_id: int | None = None


class CheckNumberDetail(BaseModel):
    role: str
    masked_display: str
    status: str
    report_count: int
    check_count: int


class CaseDetailOut(BaseModel):
    id: UUID
    reference: str
    status: str
    version: int
    created_at: datetime
    decided_at: datetime | None = None
    decided_by: UUID | None = None
    decision_reason: str | None = None
    reporter_note: str | None = None
    reporter_consent_at: datetime
    scam_type: ScamTypeSummary | None = None
    check: dict[str, Any]
    numbers: list[CheckNumberDetail]
    notes: list[CaseNoteOut]
    timeline: list[dict[str, Any]]
