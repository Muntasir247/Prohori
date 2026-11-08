"""Pydantic schemas for analytics and repeat numbers (Doc 02 Section 9, F12, F13)."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class KPIOverview(BaseModel):
    open_cases: int = 0
    high_today: int = 0
    median_time_to_decision: float | None = None  # seconds
    reviewer_agreement: float = 1.0  # ratio 0.0 - 1.0


class CasesByRiskItem(BaseModel):
    date: str
    High: int = 0
    Medium: int = 0
    Low: int = 0


class TopScamTypeItem(BaseModel):
    scam_type_id: int | None = None
    slug: str
    name: str
    name_bn: str
    count: int


class RepeatNumberSeriesItem(BaseModel):
    date: str
    count: int


class ReviewerDecisionSeriesItem(BaseModel):
    date: str
    confirmed_scam: int = 0
    not_a_scam: int = 0
    needs_escalation: int = 0
    closed: int = 0


class SurgingCampaignRadar(BaseModel):
    id: UUID
    label: str
    scam_type: str | None = None
    count_7d: int
    prev_count_7d: int
    growth_ratio: float | None = None


class AnalyticsOverviewResponse(BaseModel):
    kpis: KPIOverview
    cases_by_risk: list[CasesByRiskItem]
    top_scam_types: list[TopScamTypeItem]
    repeat_numbers: list[RepeatNumberSeriesItem]
    reviewer_decisions: list[ReviewerDecisionSeriesItem]
    surging_campaigns: list[SurgingCampaignRadar] = Field(default_factory=list)
    simulated: bool = True


class RepeatNumberItem(BaseModel):
    id: UUID
    masked_display: str
    check_count: int
    report_count: int
    high_count: int
    high_share: float
    status: str
    first_seen_at: datetime
    last_seen_at: datetime
    history_30d: list[dict[str, Any]] = Field(default_factory=list)
    linked_cases_count: int = 0


class RepeatNumbersResponse(BaseModel):
    items: list[RepeatNumberItem]
    total: int
    page: int
    page_size: int


class UpdateNumberStatusRequest(BaseModel):
    status: str = Field(..., pattern=r"^(watch|confirmed_risky|cleared)$")
    reason: str = Field(..., min_length=10, max_length=500)

