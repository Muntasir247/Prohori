"""Pydantic schemas for campaigns (Doc 02 Section 9, F27, S28)."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class CampaignItem(BaseModel):
    id: UUID
    label: str
    scam_type_id: int | None = None
    scam_type_name: str | None = None
    scam_type_name_bn: str | None = None
    member_count: int = 0
    count_7d: int = 0
    prev_count_7d: int = 0
    is_surging: bool = False
    first_seen_at: datetime | None = None
    last_seen_at: datetime | None = None
    updated_at: datetime
    sample_messages: list[str] = Field(default_factory=list)
    shared_numbers: list[str] = Field(default_factory=list)
    case_references: list[str] = Field(default_factory=list)


class CampaignsResponse(BaseModel):
    items: list[CampaignItem]
    total: int


class UpdateCampaignRequest(BaseModel):
    label: str | None = Field(None, min_length=2, max_length=120)
    merge_into: UUID | None = None
