"""Claude scam analysis and output validation stage.

Handles routing between Haiku 5.5 and Sonnet 5.5 per Doc 02 Section 10.2,
and enforces all output validators per Section 10.6:
- Enum validation for risk_level
- Allowed actions filter (drops unknown next_step_ids)
- Known patterns filter (drops hallucinated pattern codes)
- Verbatim quote validation (drops fake quotes not in masked text)
- Reasons validation: no digit run >= 5, no URLs, no banned words
- Banned phrases retry: triggers one retry on hit, then fallback
See ``docs/PROHORI_DOC02.md`` Section 10.2, 10.5, 10.6.
"""

from __future__ import annotations

import logging
import re
from typing import Any

from app.llm.client import ClaudeClient, LLMError
from app.llm.prompts import p2, p3
from app.llm.schemas import AnalysisResult, PaymentExplanationResult, RedFlagItem

logger = logging.getLogger("prohori.pipeline.analysis")

# Section 10.6 Step 5: Banned phrases include safe, guaranteed, verified, নিরাপদ, গ্যারান্টি
BANNED_WORDS: list[str] = [
    "safe",
    "guaranteed",
    "verified",
    "নিরাপদ",
    "গ্যারান্টি",
    "ঝুঁকিমুক্ত",
]

_DIGIT_RUN_REGEX = re.compile(r"\b\d{5,}\b")
_URL_REGEX = re.compile(r"https?://\S+|www\.\S+", re.IGNORECASE)


def validate_reasons(reasons: list[str]) -> tuple[bool, str | None]:
    """Check reasons against banned words, digit runs >= 5, and URLs.

    Returns:
        (is_valid, violation_reason)
    """
    for reason in reasons:
        r_lower = reason.lower()
        for banned in BANNED_WORDS:
            # Check whole-word or substring for Bangla/English banned phrases
            if banned in r_lower:
                return False, f"Contains banned phrase: '{banned}'"
        if _DIGIT_RUN_REGEX.search(reason):
            return False, "Contains digit run of 5 or more"
        if _URL_REGEX.search(reason):
            return False, "Contains URL in explanation"
    return True, None


def validate_and_clean_analysis(
    analysis: AnalysisResult,
    *,
    masked_text: str,
    allowed_action_ids: set[str],
    retrieved_pattern_codes: set[str],
) -> AnalysisResult:
    """Enforce Section 10.6 Step 4 validators on AnalysisResult."""
    # 1. next_step_ids must be subset of allowed IDs
    cleaned_actions = [
        aid for aid in analysis.next_step_ids if aid in allowed_action_ids
    ]
    if not cleaned_actions:
        # Fall back to default safe action if model output had only unknown IDs
        cleaned_actions = ["do_not_send"]

    # 2. pattern_codes must be subset of retrieved codes (unknown codes dropped)
    cleaned_patterns = [
        code for code in analysis.pattern_codes if code in retrieved_pattern_codes
    ]

    # 3. Each quote in red_flags must be found verbatim in masked_text, or dropped
    cleaned_red_flags: list[RedFlagItem] = []
    for rf in analysis.red_flags:
        if rf.quote is not None:
            if rf.quote in masked_text:
                cleaned_red_flags.append(rf)
            else:
                logger.warning(
                    "Dropping non-verbatim quote in red flag '%s': '%s'",
                    rf.flag,
                    rf.quote,
                )
                # Drop invalid/hallucinated quote
                cleaned_red_flags.append(RedFlagItem(flag=rf.flag, quote=None))
        else:
            cleaned_red_flags.append(rf)

    return AnalysisResult(
        risk_level=analysis.risk_level,
        reasons=analysis.reasons,
        red_flags=cleaned_red_flags,
        next_step_ids=cleaned_actions,
        pattern_codes=cleaned_patterns,
        scam_type=analysis.scam_type,
        language=analysis.language,
    )


def run_analysis(
    *,
    masked_text: str,
    clarity: str,
    soft_rule_count: int,
    response_language: str,
    known_patterns: list[dict[str, Any]],
    allowed_actions: list[str],
    payment_context: str | None = None,
    client: ClaudeClient | None = None,
) -> tuple[AnalysisResult | None, dict[str, Any]]:
    """Execute Prompt P2 with Haiku or Sonnet routing, validation and retry.

    Returns:
        (validated_analysis_result_or_none, telemetry_dict)
    """
    if client is None:
        client = ClaudeClient()

    # Route decision per Section 10.2:
    # clear_genuine and no soft rule -> haiku route; else sonnet route
    route = (
        "haiku" if (clarity == "clear_genuine" and soft_rule_count == 0) else "sonnet"
    )
    max_tokens = 500 if route == "haiku" else 700

    telemetry: dict[str, Any] = {
        "analysis_route": route,
        "analysis_model": None,
        "analysis_latency_ms": 0.0,
        "analysis_input_tokens": 0,
        "analysis_output_tokens": 0,
        "analysis_cache_read_tokens": 0,
        "analysis_retries": 0,
    }

    allowed_set = set(allowed_actions)
    pattern_codes_set = {p["code"] for p in known_patterns}

    user_payload = p2.build_user_payload(
        masked_text=masked_text,
        response_language=response_language,
        payment_context=payment_context,
        known_patterns=known_patterns,
        allowed_actions=allowed_actions,
    )
    messages: list[dict[str, Any]] = p2.build_few_shot_messages() + [
        {"role": "user", "content": [{"type": "text", "text": user_payload}]}
    ]

    # Attempt 1
    try:
        call_res = client.call_structured(
            route=route,
            system=p2.build_system_blocks(),
            messages=messages,
            output_format=AnalysisResult,
            max_tokens=max_tokens,
        )
        telemetry.update(
            {
                "analysis_model": call_res.model,
                "analysis_latency_ms": call_res.latency_ms,
                "analysis_input_tokens": call_res.input_tokens,
                "analysis_output_tokens": call_res.output_tokens,
                "analysis_cache_read_tokens": call_res.cache_read_tokens,
            }
        )
        raw_res: AnalysisResult = call_res.parsed

        # Validate reasons
        valid_reasons, violation = validate_reasons(raw_res.reasons)
        if valid_reasons:
            cleaned = validate_and_clean_analysis(
                raw_res,
                masked_text=masked_text,
                allowed_action_ids=allowed_set,
                retrieved_pattern_codes=pattern_codes_set,
            )
            return cleaned, telemetry

        logger.warning(
            "Output validation failed on attempt 1 (%s); retrying once", violation
        )
        telemetry["analysis_retries"] = 1

    except (LLMError, Exception) as exc:
        logger.warning("Analysis attempt 1 failed with error (%s); retrying once", exc)
        telemetry["analysis_retries"] = 1

    # Retry once with same model per Section 10.6 Step 5
    try:
        retry_prompt = (
            user_payload
            + "\n\nIMPORTANT RULE CORRECTION: Never use banned words like 'safe', "
            "'guaranteed', 'verified', 'নিরাপদ', or 'গ্যারান্টি'. Explain only "
            "the observed warning signs or lack thereof."
        )
        retry_messages = p2.build_few_shot_messages() + [
            {"role": "user", "content": [{"type": "text", "text": retry_prompt}]}
        ]
        call_res_retry = client.call_structured(
            route=route,
            system=p2.build_system_blocks(),
            messages=retry_messages,
            output_format=AnalysisResult,
            max_tokens=max_tokens,
        )
        telemetry["analysis_latency_ms"] += call_res_retry.latency_ms
        telemetry["analysis_input_tokens"] += call_res_retry.input_tokens
        telemetry["analysis_output_tokens"] += call_res_retry.output_tokens
        telemetry["analysis_cache_read_tokens"] += call_res_retry.cache_read_tokens
        raw_res_retry: AnalysisResult = call_res_retry.parsed

        valid_reasons, violation = validate_reasons(raw_res_retry.reasons)
        if valid_reasons:
            cleaned = validate_and_clean_analysis(
                raw_res_retry,
                masked_text=masked_text,
                allowed_action_ids=allowed_set,
                retrieved_pattern_codes=pattern_codes_set,
            )
            return cleaned, telemetry

        logger.error(
            "Output validation failed on attempt 2 (%s); proceeding to safe fallback",
            violation,
        )
        return None, telemetry

    except (LLMError, Exception) as exc:
        logger.error(
            "Analysis attempt 2 failed with error (%s); proceeding to safe fallback",
            exc,
        )
        return None, telemetry


def run_payment_explanation(
    *,
    payment_context: str,
    risk_summary: str,
    risk_level: str,
    response_language: str,
    allowed_actions: list[str],
    client: ClaudeClient | None = None,
) -> tuple[PaymentExplanationResult | None, dict[str, Any]]:
    """Run Prompt P3 for payment-only requests without a message."""
    if client is None:
        client = ClaudeClient()

    # Route: Haiku 5.5, Sonnet if risk_level is High
    route = "sonnet" if risk_level == "High" else "haiku"
    max_tokens = 300

    telemetry: dict[str, Any] = {
        "analysis_route": f"payment_{route}",
        "analysis_model": None,
        "analysis_latency_ms": 0.0,
        "analysis_input_tokens": 0,
        "analysis_output_tokens": 0,
        "analysis_cache_read_tokens": 0,
    }

    user_payload = p3.build_user_payload(
        payment_context=payment_context,
        risk_summary=risk_summary,
        response_language=response_language,
        allowed_actions=allowed_actions,
    )

    try:
        call_res = client.call_structured(
            route=route,
            system=p3.build_system_blocks(),
            messages=[
                {"role": "user", "content": [{"type": "text", "text": user_payload}]}
            ],
            output_format=PaymentExplanationResult,
            max_tokens=max_tokens,
        )
        telemetry.update(
            {
                "analysis_model": call_res.model,
                "analysis_latency_ms": call_res.latency_ms,
                "analysis_input_tokens": call_res.input_tokens,
                "analysis_output_tokens": call_res.output_tokens,
                "analysis_cache_read_tokens": call_res.cache_read_tokens,
            }
        )
        raw_res: PaymentExplanationResult = call_res.parsed
        valid, violation = validate_reasons(raw_res.reasons)
        if valid:
            allowed_set = set(allowed_actions)
            cleaned_actions = [
                aid for aid in raw_res.next_step_ids if aid in allowed_set
            ] or ["do_not_send"]
            return PaymentExplanationResult(
                reasons=raw_res.reasons, next_step_ids=cleaned_actions
            ), telemetry
    except Exception as exc:
        logger.warning("Payment explanation call failed: %s", exc)

    return None, telemetry
