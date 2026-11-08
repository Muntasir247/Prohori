"""Admin schemas (Doc 01 S30-S35, Doc 02 Section 9)."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


# --- Knowledge Base --------------------------------------------------------
class KbDocumentCreate(BaseModel):
    code: str = Field(..., max_length=12)
    title: str = Field(..., max_length=160)
    scam_type_id: int
    language: str = Field(..., pattern=r"^(bn|en|banglish)$")
    source_url: str | None = None
    body: str


class KbDocumentUpdate(BaseModel):
    title: str | None = Field(None, max_length=160)
    scam_type_id: int | None = None
    language: str | None = Field(None, pattern=r"^(bn|en|banglish)$")
    source_url: str | None = None
    body: str | None = None


class KbChunkOut(BaseModel):
    id: int
    chunk_index: int
    content: str
    token_count: int


class KbDocumentOut(BaseModel):
    id: UUID
    code: str
    title: str
    scam_type_id: int
    scam_type_slug: str | None = None
    scam_type_name: str | None = None
    language: str
    source_url: str | None = None
    body: str
    status: str
    created_at: datetime
    updated_at: datetime
    chunk_count: int = 0


class KbDocumentDetailOut(KbDocumentOut):
    chunks: list[KbChunkOut] = []


class KbPublishResponse(BaseModel):
    ok: bool
    document_id: UUID
    chunks_published: int
    status: str


# --- Safe Actions ----------------------------------------------------------
class SafeActionCreate(BaseModel):
    id: str = Field(..., max_length=40)
    label_en: str = Field(..., max_length=160)
    label_bn: str = Field(..., max_length=160)
    body_en: str | None = None
    body_bn: str | None = None
    context: str = Field(
        "before_payment", pattern=r"^(before_payment|after_payment|both)$"
    )
    min_level: str = Field("Low", pattern=r"^(Low|Medium|High)$")
    provider: str | None = None
    phone: str | None = None
    source_url: str | None = None
    verified_at: date | None = None
    is_active: bool = False
    sort_order: int = 100


class SafeActionUpdate(BaseModel):
    label_en: str | None = None
    label_bn: str | None = None
    body_en: str | None = None
    body_bn: str | None = None
    context: str | None = Field(None, pattern=r"^(before_payment|after_payment|both)$")
    min_level: str | None = Field(None, pattern=r"^(Low|Medium|High)$")
    provider: str | None = None
    phone: str | None = None
    source_url: str | None = None
    verified_at: date | None = None
    is_active: bool | None = None
    sort_order: int | None = None


class SafeActionAdminOut(BaseModel):
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
    sort_order: int
    needs_reverification: bool = False
    warning: str | None = None


# --- Quality & Prompts -----------------------------------------------------
class PromptVersionOut(BaseModel):
    id: int
    name: str
    version: str
    body_sha256: str
    is_active: bool
    created_at: datetime


class EvalRunOut(BaseModel):
    id: int
    prompt_version_id: int | None = None
    prompt_version_name: str | None = None
    prompt_version: str | None = None
    dataset_version: str
    item_count: int
    high_precision: Decimal | None = None
    high_recall: Decimal | None = None
    genuine_high_rate: Decimal | None = None
    unsafe_flags: int = 0
    report: dict[str, Any] = {}
    created_at: datetime


class RouteMixItem(BaseModel):
    route: str
    count: int
    percentage: float


class QualityMetricsResponse(BaseModel):
    kpi_precision: float | None = None
    kpi_recall: float | None = None
    kpi_genuine_high_rate: float | None = None
    kpi_unsafe_flags: int = 0
    prompt_versions: list[PromptVersionOut] = []
    eval_runs: list[EvalRunOut] = []
    route_mix: list[RouteMixItem] = []
    total_checks: int = 0
    total_input_tokens: int = 0
    total_output_tokens: int = 0
    total_cache_read_tokens: int = 0
    cache_hit_rate: float = 0.0
    notice: str = "Measured on simulated data only (simulated-v1)"


# --- Users -----------------------------------------------------------------
class AdminUserOut(BaseModel):
    id: UUID
    email: str
    display_name: str
    role: str
    is_active: bool
    created_at: datetime


class AdminInviteIn(BaseModel):
    email: str
    role: str = Field(..., pattern=r"^(reviewer|admin)$")


class AdminInviteOut(BaseModel):
    email: str
    role: str
    invite_url: str
    expires_at: datetime


class AdminUserUpdateIn(BaseModel):
    role: str | None = Field(None, pattern=r"^(user|reviewer|admin)$")
    is_active: bool | None = None


# --- API Keys --------------------------------------------------------------
class ApiKeyCreateIn(BaseModel):
    name: str = Field(..., min_length=2, max_length=80)
    key_type: str = Field("live", pattern=r"^(test|live)$")
    scopes: list[str] = Field(..., min_length=1)
    rate_limit_per_min: int = Field(60, ge=1, le=1000)


class ApiKeyCreateOut(BaseModel):
    id: UUID
    name: str
    key_prefix: str
    scopes: list[str]
    rate_limit_per_min: int
    created_at: datetime
    raw_key: str
    notice: str = "Copy this key now. It will never be shown again."


class ApiKeyOut(BaseModel):
    id: UUID
    name: str
    key_prefix: str
    scopes: list[str]
    rate_limit_per_min: int
    last_used_at: datetime | None = None
    revoked_at: datetime | None = None
    created_at: datetime
    is_active: bool


# --- Audit Log -------------------------------------------------------------
class AuditEventOut(BaseModel):
    id: int
    actor_id: UUID | None = None
    actor_role: str | None = None
    action: str
    entity_type: str
    entity_id: str
    before: dict[str, Any] | None = None
    after: dict[str, Any] | None = None
    request_id: str | None = None
    created_at: datetime


class AuditLogResponse(BaseModel):
    items: list[AuditEventOut]
    total: int
    page: int
    page_size: int
