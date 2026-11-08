"""Cases schemas (Doc 02 Section 9)."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


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
