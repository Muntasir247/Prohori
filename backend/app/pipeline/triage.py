"""Triage stage using Claude Haiku 5.5.

Extracts language, claimed sender, amounts, urgency phrases, normalized query,
and clarity per Prompt P1.
If Claude fails or times out, falls back to deterministic regex fields with
clarity='ambiguous' so processing continues cleanly via the Sonnet route.
See ``docs/PROHORI_DOC02.md`` Section 10.1, 10.2, 10.5, 10.6.
"""

from __future__ import annotations

import logging
import re
from typing import Any

from app.llm.client import ClaudeClient, LLMError
from app.llm.prompts import p1
from app.llm.schemas import TriageResult
from app.pipeline.normalize import guess_language_script

logger = logging.getLogger("prohori.pipeline.triage")


def _fallback_triage(
    masked_text: str,
    regex_amounts: list[str] | None = None,
) -> TriageResult:
    """Deterministic fallback triage when Haiku fails or times out."""
    detected_lang = guess_language_script(masked_text)
    lang = detected_lang if detected_lang in ("bn", "en") else "banglish"
    resp_lang = "en" if lang == "en" else "bn"

    # Clean placeholders from query
    cleaned_query = re.sub(r"\[[A-Z_]+(?::[^\]]+)?\]", "", masked_text)
    cleaned_query = re.sub(r"\s+", " ", cleaned_query).strip()
    if not cleaned_query:
        cleaned_query = "Suspicious mobile money request"

    amount_str = ", ".join(regex_amounts) if regex_amounts else None

    return TriageResult(
        language=lang,
        response_language=resp_lang,
        claimed_sender=None,
        amount_text=amount_str,
        urgency_phrases=[],
        normalized_query=cleaned_query,
        clarity="ambiguous",
    )


def run_triage(
    masked_text: str,
    client: ClaudeClient | None = None,
    regex_amounts: list[str] | None = None,
) -> tuple[TriageResult, dict[str, Any]]:
    """Run intake triage with Haiku 5.5 (Prompt P1).

    Returns:
        (triage_result, telemetry_dict)
    """
    if client is None:
        client = ClaudeClient()

    telemetry: dict[str, Any] = {
        "triage_model": None,
        "triage_latency_ms": 0.0,
        "triage_input_tokens": 0,
        "triage_output_tokens": 0,
        "triage_cache_read_tokens": 0,
        "triage_fallback_used": False,
    }

    try:
        call_res = client.call_structured(
            route="haiku",
            system=p1.build_system_blocks(),
            messages=[{"role": "user", "content": p1.build_user_message(masked_text)}],
            output_format=TriageResult,
            max_tokens=400,
        )
        triage_res: TriageResult = call_res.parsed
        telemetry.update(
            {
                "triage_model": call_res.model,
                "triage_latency_ms": call_res.latency_ms,
                "triage_input_tokens": call_res.input_tokens,
                "triage_output_tokens": call_res.output_tokens,
                "triage_cache_read_tokens": call_res.cache_read_tokens,
            }
        )
    except (LLMError, Exception) as exc:
        logger.warning(
            "Haiku triage failed (%s); using deterministic regex fields", exc
        )
        triage_res = _fallback_triage(masked_text, regex_amounts=regex_amounts)
        telemetry["triage_fallback_used"] = True

    # Rule 10.6.1: Merge fields with regex; regex wins on numbers, amounts, links
    if regex_amounts:
        triage_res.amount_text = ", ".join(regex_amounts)

    return triage_res, telemetry
