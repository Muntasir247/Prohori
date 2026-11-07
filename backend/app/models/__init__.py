"""SQLAlchemy ORM models.

Models accrete across phases. Phase 04 defines the authentication tables; the
remaining tables of Doc 02 Section 8 arrive with their phases. ``Base.metadata``
is the single source of truth the test suite uses to create tables on SQLite.
"""

from __future__ import annotations

from app.models.audit import AuditEvent
from app.models.auth_token import AuthToken, TokenPurpose
from app.models.base import Base
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
]
