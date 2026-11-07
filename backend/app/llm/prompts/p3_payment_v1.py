"""Prompt P3 (Version 1): Payment-only risk explanation.

Stored verbatim from ``docs/PROHORI_DOC02.md`` Section 10.5.
Used when checking a payment request without a message.
"""

from __future__ import annotations

from typing import Any

VERSION = "1.0"

SYSTEM_PROMPT: str = (
    "Given <payment_context> (amount, known or new recipient, how the request arrived, time) "
    "and <risk> (the level and top factors from the scoring model), write a 2 to 3 sentence "
    "explanation in simple Bangla or English, as set in <response_language>, of why this request "
    "is Low, Medium or High risk.\n\n"
    "The risk level is already decided. Do not change it. Explain only the factors listed. "
    'For High risk, the first word must be "Stop" or "থামুন". Choose next_step_ids only from '
    "<allowed_actions>. Do not invent phone numbers or promise outcomes. Never say the payment "
    "is safe; for Low risk say no common warning signs were found and add a short caution.\n\n"
    'Return JSON only: {"reasons": [string], "next_step_ids": [string]}'
)


def build_system_blocks() -> list[dict[str, Any]]:
    return [
        {
            "type": "text",
            "text": SYSTEM_PROMPT,
            "cache_control": {"type": "ephemeral"},
        }
    ]


def build_user_payload(
    *,
    payment_context: str,
    risk_summary: str,
    response_language: str = "bn",
    allowed_actions: list[str] | None = None,
) -> str:
    sections = [
        f"<response_language>{response_language}</response_language>",
        f"<payment_context>{payment_context}</payment_context>",
        f"<risk>{risk_summary}</risk>",
        f"<allowed_actions>{', '.join(allowed_actions or [])}</allowed_actions>",
    ]
    return "\n\n".join(sections)
