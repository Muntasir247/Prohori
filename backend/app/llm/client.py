"""Anthropic Claude API client wrapper.

Implements the official ``anthropic`` SDK integration per
``docs/PROHORI_DOC02.md`` Section 10.1, 10.2 and Phase 06 instructions:
- Models: claude-haiku-5-5 and claude-sonnet-5-5 from config
- Structured outputs via client.messages.parse(output_format=...)
- No sampling parameters (temperature, top_p, top_k, budget_tokens)
- output_config effort: "low" for Haiku, "medium" for Sonnet
- stop_reason checks: handling refusal and max_tokens
- Server-side fallback on Sonnet via extra_headers and extra_body
- Timeouts: Haiku 4 s, Sonnet 8 s, max_retries=1
- Tracks token usage, cache_read_input_tokens, and enforces DAILY_LLM_SPEND_CAP_USD
"""

from __future__ import annotations

import datetime as dt
import logging
from typing import Any, TypeVar

import anthropic
from anthropic import Anthropic, APIConnectionError, APITimeoutError, RateLimitError
from pydantic import BaseModel

from app.config import Settings, get_settings

logger = logging.getLogger("prohori.llm")

T = TypeVar("T", bound=BaseModel)


class LLMError(Exception):
    """Base error for Claude LLM stage failures."""


class LLMRefusalError(LLMError):
    """Raised when Claude refuses to answer (stop_reason='refusal')."""


class LLMMaxTokensError(LLMError):
    """Raised when output is truncated due to max_tokens."""


class LLMTimeoutError(LLMError):
    """Raised when an LLM call exceeds its allocated timeout."""


class LLMSpendCapExceededError(LLMError):
    """Raised when the daily spend ceiling has been crossed."""


# Rate prices per 1M tokens in USD (simulated/conservative estimates)
PRICING_PER_1M = {
    "haiku": {
        "input": 0.80,
        "output": 4.00,
        "cache_read": 0.08,
        "cache_create": 1.00,
    },
    "sonnet": {
        "input": 3.00,
        "output": 15.00,
        "cache_read": 0.30,
        "cache_create": 3.75,
    },
}


class SpendTracker:
    """In-memory daily spend tracker enforcing DAILY_LLM_SPEND_CAP_USD."""

    def __init__(self) -> None:
        self._current_date: dt.date = dt.date.today()
        self._daily_spend_usd: float = 0.0

    def _roll_if_needed(self) -> None:
        today = dt.date.today()
        if today != self._current_date:
            self._current_date = today
            self._daily_spend_usd = 0.0

    def get_current_spend(self) -> float:
        self._roll_if_needed()
        return self._daily_spend_usd

    def record_cost(self, cost_usd: float) -> float:
        self._roll_if_needed()
        self._daily_spend_usd += cost_usd
        return self._daily_spend_usd

    def reset_for_testing(self) -> None:
        self._daily_spend_usd = 0.0
        self._current_date = dt.date.today()


_SPEND_TRACKER = SpendTracker()


class LLMCallResult:
    """Wrapper holding parsed schema output and operational telemetry."""

    def __init__(
        self,
        *,
        parsed: Any,
        model: str,
        stop_reason: str | None,
        input_tokens: int,
        output_tokens: int,
        cache_read_tokens: int,
        cache_creation_tokens: int,
        estimated_cost_usd: float,
        latency_ms: float,
    ) -> None:
        self.parsed = parsed
        self.model = model
        self.stop_reason = stop_reason
        self.input_tokens = input_tokens
        self.output_tokens = output_tokens
        self.cache_read_tokens = cache_read_tokens
        self.cache_creation_tokens = cache_creation_tokens
        self.estimated_cost_usd = estimated_cost_usd
        self.latency_ms = latency_ms


class ClaudeClient:
    """Thin, robust client wrapper around Anthropic Python SDK."""

    def __init__(
        self,
        settings: Settings | None = None,
        raw_client: Anthropic | None = None,
    ) -> None:
        self.settings = settings or get_settings()
        self._client = raw_client or Anthropic(
            api_key=self.settings.anthropic_api_key,
            max_retries=1,
        )

    def _estimate_cost(
        self,
        model: str,
        input_tokens: int,
        output_tokens: int,
        cache_read: int,
        cache_create: int,
    ) -> float:
        rates = (
            PRICING_PER_1M["haiku"]
            if "haiku" in model.lower()
            else PRICING_PER_1M["sonnet"]
        )
        cost = (
            (input_tokens * rates["input"] / 1_000_000)
            + (output_tokens * rates["output"] / 1_000_000)
            + (cache_read * rates["cache_read"] / 1_000_000)
            + (cache_create * rates["cache_create"] / 1_000_000)
        )
        return round(cost, 6)

    def call_structured(
        self,
        *,
        route: str,  # "haiku" or "sonnet"
        system: list[dict[str, Any]],
        messages: list[dict[str, Any]],
        output_format: type[T],
        max_tokens: int = 700,
    ) -> LLMCallResult:
        """Call Claude with structured outputs via client.messages.parse.

        Enforces:
        - Spend cap
        - Timeouts per route
        - Effort level ("low" for Haiku, "medium" for Sonnet)
        - Server-side fallback on Sonnet
        - Stop reason checks for refusal and max_tokens
        - Cache logging
        """
        current_spend = _SPEND_TRACKER.get_current_spend()
        if current_spend >= self.settings.daily_llm_spend_cap_usd:
            logger.warning(
                "Daily spend cap exceeded: $%.4f >= $%.4f",
                current_spend,
                self.settings.daily_llm_spend_cap_usd,
            )
            raise LLMSpendCapExceededError(
                f"Daily cap of ${self.settings.daily_llm_spend_cap_usd:.2f} reached"
            )

        is_sonnet = route == "sonnet"
        model = (
            self.settings.anthropic_model_sonnet
            if is_sonnet
            else self.settings.anthropic_model_haiku
        )
        timeout = (
            self.settings.sonnet_timeout_seconds
            if is_sonnet
            else self.settings.haiku_timeout_seconds
        )
        effort = "medium" if is_sonnet else "low"

        # Headers and fallback setup per current SDK specifications
        extra_headers: dict[str, str] = {
            "anthropic-beta": "prompt-caching-2024-07-31",
        }
        extra_body: dict[str, Any] = {}

        if is_sonnet:
            # Current server-side fallback on Sonnet per Section 10.2
            extra_headers["anthropic-beta"] = (
                "server-side-fallback-2026-07-01,prompt-caching-2024-07-31"
            )
            extra_body["fallbacks"] = [
                {
                    "model": self.settings.anthropic_model_haiku,
                    "output_config": {"effort": "low"},
                }
            ]

        start_time = dt.datetime.now(dt.UTC)
        try:
            # client.messages.parse without temperature, top_p, top_k, budget_tokens
            response = self._client.messages.parse(
                model=model,
                max_tokens=max_tokens,
                system=system,
                messages=messages,
                output_format=output_format,
                output_config={"effort": effort},
                extra_headers=extra_headers,
                extra_body=extra_body if extra_body else None,
                timeout=timeout,
            )
        except (APITimeoutError, TimeoutError) as exc:
            logger.error("Claude call timed out after %.1fs: %s", timeout, exc)
            raise LLMTimeoutError(f"Claude {route} call timed out: {exc}") from exc
        except (APIConnectionError, RateLimitError) as exc:
            logger.error("Claude API network/rate error: %s", exc)
            raise LLMError(f"Claude API connection error: {exc}") from exc
        except anthropic.APIStatusError as exc:
            logger.error("Claude API status error: %s", exc)
            raise LLMError(f"Claude API error: {exc}") from exc
        except Exception as exc:
            logger.error("Unexpected error during Claude call: %s", exc)
            raise LLMError(f"Unexpected Claude call failure: {exc}") from exc

        elapsed_ms = (dt.datetime.now(dt.UTC) - start_time).total_seconds() * 1000.0

        # Check stop_reason
        stop_reason = response.stop_reason
        if stop_reason == "refusal":
            logger.warning("Claude refused to answer the prompt")
            raise LLMRefusalError("Model refused to answer the prompt")
        if stop_reason == "max_tokens":
            logger.warning("Claude hit max_tokens limit (%d tokens)", max_tokens)
            raise LLMMaxTokensError(f"Model reached max_tokens limit of {max_tokens}")

        usage = response.usage
        input_tokens = getattr(usage, "input_tokens", 0) or 0
        output_tokens = getattr(usage, "output_tokens", 0) or 0
        cache_read = getattr(usage, "cache_read_input_tokens", 0) or 0
        cache_create = getattr(usage, "cache_creation_input_tokens", 0) or 0

        # Log cache usage as required
        logger.info(
            "Claude %s: in=%d, out=%d, cache_read_input_tokens=%d, latency=%.0fms",
            model,
            input_tokens,
            output_tokens,
            cache_read,
            elapsed_ms,
        )

        cost = self._estimate_cost(
            model, input_tokens, output_tokens, cache_read, cache_create
        )
        _SPEND_TRACKER.record_cost(cost)

        parsed_data = getattr(response, "parsed", None)
        if parsed_data is None:
            raise LLMError("Parsed output was null from Claude response")

        return LLMCallResult(
            parsed=parsed_data,
            model=model,
            stop_reason=stop_reason,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cache_read_tokens=cache_read,
            cache_creation_tokens=cache_create,
            estimated_cost_usd=cost,
            latency_ms=elapsed_ms,
        )

    def call_plain_text(
        self,
        *,
        system: list[dict[str, Any]],
        prompt: str,
        max_tokens: int = 150,
        timeout: float = 4.0,
    ) -> str:
        """Call Claude Haiku for plain text generation (e.g. Prompt P6 HyDE)."""
        current_spend = _SPEND_TRACKER.get_current_spend()
        if current_spend >= self.settings.daily_llm_spend_cap_usd:
            raise LLMSpendCapExceededError("Daily spend cap exceeded")

        model = self.settings.anthropic_model_haiku
        try:
            response = self._client.messages.create(
                model=model,
                max_tokens=max_tokens,
                system=system,
                messages=[{"role": "user", "content": prompt}],
                output_config={"effort": "low"},
                timeout=timeout,
            )
        except Exception as exc:
            raise LLMError(f"Plain text generation failed: {exc}") from exc

        if response.stop_reason == "refusal":
            raise LLMRefusalError("Model refused plain text request")

        text_content = ""
        for block in response.content:
            if getattr(block, "type", "") == "text":
                text_content += getattr(block, "text", "")

        return text_content.strip()
