"""SQLAlchemy ORM models.

Models accrete across phases. Phase 04 defines the authentication tables; Phase 07
adds check, case, risky number, knowledge, and API key models. ``Base.metadata``
is the single source of truth the test suite uses to create tables on SQLite.
"""

from __future__ import annotations

from app.models.api_key import ApiKey
from app.models.audit import AuditEvent
from app.models.auth_token import AuthToken, TokenPurpose
from app.models.base import Base
from app.models.check import (
    Campaign,
    Case,
    Check,
    CheckEmbedding,
    CheckNumber,
    DailyAggregate,
    RiskyNumber,
    ScamType,
)
from app.models.knowledge import SafeAction, Sample, Tip
from app.models.rate_limit import RateLimitCounter
from app.models.session import Session
from app.models.user import User, UserRole

__all__ = [
    "Base",
    "User",
    "UserRole",
    "Session",
    "AuthToken",
    "TokenPurpose",
    "AuditEvent",
    "RateLimitCounter",
    "Check",
    "CheckNumber",
    "RiskyNumber",
    "ScamType",
    "Campaign",
    "Case",
    "DailyAggregate",
    "CheckEmbedding",
    "SafeAction",
    "Sample",
    "Tip",
    "ApiKey",
]
