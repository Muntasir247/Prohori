"""Schemas for in-app notifications (Doc 02 Section 9, F22, S23)."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class NotificationOut(BaseModel):
    id: UUID
    type: str
    payload: dict[str, Any] = Field(default_factory=dict)
    read_at: datetime | None = None
    created_at: datetime


class NotificationListResponse(BaseModel):
    items: list[NotificationOut]
    unread_count: int
    next_cursor: str | None = None


class NotificationReadIn(BaseModel):
    ids: list[UUID] | None = None
    all: bool = False
