"""Request/response schemas for the auth endpoints (Doc 02 Section 9)."""

from __future__ import annotations

import re
from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

# Pragmatic email shape check (we avoid the email-validator dependency). Real
# deliverability is proven by the verification link, not by this pattern.
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _valid_email(value: str) -> str:
    value = value.strip().lower()
    if not _EMAIL_RE.match(value) or len(value) > 320:
        raise ValueError("invalid_email")
    return value


class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: str
    password: str = Field(min_length=1, max_length=200)
    language: Literal["bn", "en"] = "bn"
    consent: bool = False

    _norm_email = field_validator("email")(_valid_email)


class VerifyEmailIn(BaseModel):
    token: str = Field(min_length=1, max_length=256)


class ResendVerificationIn(BaseModel):
    email: str
    _norm_email = field_validator("email")(_valid_email)


class LoginIn(BaseModel):
    email: str
    password: str = Field(min_length=1, max_length=200)
    _norm_email = field_validator("email")(_valid_email)


class ForgotPasswordIn(BaseModel):
    email: str
    _norm_email = field_validator("email")(_valid_email)


class ResetPasswordIn(BaseModel):
    token: str = Field(min_length=1, max_length=256)
    password: str = Field(min_length=1, max_length=200)


class AcceptInviteIn(BaseModel):
    token: str = Field(min_length=1, max_length=256)
    name: str = Field(min_length=2, max_length=80)
    password: str = Field(min_length=1, max_length=200)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    display_name: str
    role: str
    language: str
    theme: str
    email_verified: bool
    onboarding_completed: bool
    created_at: datetime

    @classmethod
    def from_user(cls, user) -> UserOut:
        return cls(
            id=user.id,
            email=user.email,
            display_name=user.display_name,
            role=user.role,
            language=user.language,
            theme=user.theme,
            email_verified=user.email_verified_at is not None,
            onboarding_completed=user.onboarding_completed_at is not None,
            created_at=user.created_at,
        )
