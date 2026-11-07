"""Pydantic schemas for Claude structured output.

Used with ``client.messages.parse(output_format=...)``.
See ``docs/PROHORI_DOC02.md`` Section 10.5.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class TriageResult(BaseModel):
    """Output schema for intake / triage step (Prompt P1)."""

    language: Literal["bn", "en", "banglish"] = Field(
        ..., description="Detected script/language of the user's message"
    )
    response_language: Literal["bn", "en"] = Field(
        ..., description="'bn' unless message is clearly English, then 'en'"
    )
    claimed_sender: str | None = Field(
        default=None, description="Who the message claims to be, or null"
    )
    amount_text: str | None = Field(
        default=None, description="Any amount mentioned in the message, or null"
    )
    urgency_phrases: list[str] = Field(
        default_factory=list,
        description="Exact phrases pushing fast action copied from message",
    )
    normalized_query: str = Field(
        ...,
        description="One sentence in English describing the request, for retrieval",
    )
    clarity: Literal["clear_genuine", "clear_scam", "ambiguous"] = Field(
        ...,
        description="Clarity decision for downstream routing",
    )


class RedFlagItem(BaseModel):
    """An identified red flag with an optional exact verbatim quote."""

    flag: str = Field(..., description="Short identifier of the red flag")
    quote: str | None = Field(
        default=None,
        description="Exact quote copied character-for-character from message, or null",
    )


class AnalysisResult(BaseModel):
    """Output schema for Claude scam analysis (Prompt P2)."""

    risk_level: Literal["Low", "Medium", "High"] = Field(
        ..., description="Candidate risk level (candidate only; fusion decides final)"
    )
    reasons: list[str] = Field(
        ..., description="2 to 4 short sentences explaining the trick or lack thereof"
    )
    red_flags: list[RedFlagItem] = Field(
        default_factory=list, description="List of detected red flags with exact quotes"
    )
    next_step_ids: list[str] = Field(
        default_factory=list,
        description="Subset of allowed safe-action IDs chosen from <allowed_actions>",
    )
    pattern_codes: list[str] = Field(
        default_factory=list,
        description="Subset of known pattern codes cited from <known_patterns>",
    )
    scam_type: Literal[
        "fake_otp_pin",
        "fake_staff",
        "prize_cashback",
        "wrong_number_refund",
        "fake_agent",
        "other",
        "none",
    ] = Field(..., description="Categorized scam type or 'none'")
    language: Literal["bn", "en"] = Field(
        ..., description="Language used for reasons and advice ('bn' or 'en')"
    )


class PaymentExplanationResult(BaseModel):
    """Output schema for payment explanation without a message (Prompt P3)."""

    reasons: list[str] = Field(
        ..., description="2 to 3 sentence explanation of the payment risk factors"
    )
    next_step_ids: list[str] = Field(
        ..., description="Subset of allowed safe-action IDs"
    )
