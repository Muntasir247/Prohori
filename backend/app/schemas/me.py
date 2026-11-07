"""Request/response schemas for the /me endpoints (Doc 02 Section 9)."""

from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class MeUpdateIn(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=80)
    language: Literal["bn", "en"] | None = None
    theme: Literal["system", "light", "dark"] | None = None
    onboarding_completed: bool | None = None


class PasswordChangeIn(BaseModel):
    current: str = Field(min_length=1, max_length=200)
    new: str = Field(min_length=1, max_length=200)


class DeleteAccountIn(BaseModel):
    confirm: str


class SessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_agent: str | None
    last_seen_at: datetime
    created_at: datetime
    current: bool = False
