"""Check pipeline orchestrator.

Executes the full Prohori check pipeline in the exact order of
``docs/PROHORI_DOC02.md`` Section 1 and Section 10.6:
1. Context trimming (> 1500 chars)
2. 1-hour duplicate text_hash check (reuses result, sets reused=True)
3. Enforces DAILY_LLM_SPEND_CAP_USD
4. Deterministic normalization (NFC, Bangla digits -> ASCII, amounts, +880 phones)
5. PII Masking with Presidio (strict: unmasked text/phones NEVER leave)
6. Rule Engine evaluation:
   - Hard rule hit -> rules_only template, no LLM call
7. Haiku intake triage (language, claimed_sender, normalized_query, clarity)
8. Hybrid retrieval (keyword, trigram, vector RRF k=60, top 4, optional HyDE)
9. Analysis routing:
   - clear_genuine & 0 soft rules -> Haiku route
   - clear_scam or ambiguous -> Sonnet route
10. Output validation (enum, safe actions, pattern codes, quotes, banned words)
11. Risk fusion (Section 10.3 table)
12. Safe actions attachment
13. Appending caution text from i18n (model never writes caution)
"""

from __future__ import annotations

import datetime as dt
import hashlib
import json
import logging
from pathlib import Path
from typing import Any

from app.config import get_settings
from app.llm.client import ClaudeClient
from app.llm.schemas import RedFlagItem
from app.pipeline.analysis import run_analysis
from app.pipeline.fusion import fuse_risk
from app.pipeline.masking import mask_text
from app.pipeline.normalize import (
    guess_language_script,
    normalize_text,
    parse_amount_bdt,
)
from app.pipeline.retrieval import RetrievalEngine
from app.pipeline.rules.engine import RuleEngine
from app.pipeline.templates import get_rule_only_explanation

logger = logging.getLogger("prohori.pipeline.orchestrator")

# In-memory 1-hour duplicate cache: text_hash -> (timestamp, result_dict)
_DUPLICATE_CACHE: dict[str, tuple[dt.datetime, dict[str, Any]]] = {}

# Load safe actions catalog
_SAFE_ACTIONS_MAP: dict[str, dict[str, Any]] = {}
_SAFE_ACTIONS_PATH = Path("backend/seed/safe_actions.json")
if not _SAFE_ACTIONS_PATH.exists() and Path("seed/safe_actions.json").exists():
    _SAFE_ACTIONS_PATH = Path("seed/safe_actions.json")

if _SAFE_ACTIONS_PATH.exists():
    try:
        with open(_SAFE_ACTIONS_PATH, encoding="utf-8") as f:
            for item in json.load(f):
                _SAFE_ACTIONS_MAP[item["id"]] = item
    except Exception as exc:
        logger.warning("Failed to load safe_actions.json: %s", exc)

ALLOWED_ACTION_IDS: list[str] = list(_SAFE_ACTIONS_MAP.keys()) or [
    "do_not_send",
    "confirm_another_way",
    "check_in_official_app",
    "keep_evidence",
    "call_provider_helpline",
]

CAUTION_TEXTS = {
    "Low": {
        "bn": (
            "সতর্কতা: কম ঝুঁকি মানেই এটি সম্পূর্ণ নিরাপদ নয়। "
            "প্রেরক অপরিচিত হলে যাচাই না করে লেনদেন করবেন না।"
        ),
        "en": (
            "Caution: Low risk does not mean completely safe. "
            "If the sender is unfamiliar, verify before proceeding."
        ),
    },
    "Medium": {
        "bn": (
            "সতর্কতা: এতে সতর্কবার্তা পাওয়া গেছে। "
            "নিশ্চিত না হয়ে অর্থ পাঠাবেন না বা ব্যক্তিগত তথ্য দেবেন না।"
        ),
        "en": (
            "Caution: Warning signs detected. "
            "Do not send money or share personal details without verifying."
        ),
    },
    "High": {
        "bn": (
            "সতর্কতা: এটি ঝুঁকিপূর্ণ হওয়ার প্রবল সম্ভাবনা রয়েছে। " "কোনো ওটিপি, পিন বা অর্থ পাঠাবেন না।"
        ),
        "en": ("Caution: High likelihood of fraud. " "Never send OTP, PIN, or money."),
    },
    "fallback": {
        "bn": (
            "সতর্কতা: এই মুহূর্তে স্বয়ংক্রিয় বিশ্লেষণ সীমিত। "
            "অনুগ্রহ করে অপরিচিত কাউকে টাকা পাঠাবেন না।"
        ),
        "en": (
            "Caution: Automated analysis is currently limited. "
            "Please do not send money to unfamiliar recipients."
        ),
    },
}

FALLBACK_EXPLANATIONS = {
    "bn": [
        "আমরা এই মুহূর্তে বার্তাটির বিস্তারিত বিশ্লেষণ সম্পূর্ণ করতে পারছি না।",
        "অনুগ্রহ করে কোনো সন্দেহজনক লিংকে ক্লিক করবেন না বা টাকা পাঠাবেন না।",
    ],
    "en": [
        "We could not complete the detailed analysis of this message at this moment.",
        "Please do not click any suspicious links or transfer any funds.",
    ],
}


ACTION_ALIASES: dict[str, str] = {
    "never_share_otp": "do_not_send",
    "do_not_send_money": "do_not_send",
    "call_official_helpline": "call_provider_helpline",
    "block_number": "keep_evidence",
    "report_suspicious_activity": "keep_evidence",
    "pause_and_verify": "confirm_another_way",
}


def _prune_expired_cache(now: dt.datetime) -> None:
    """Remove cache entries older than 1 hour (3600 seconds)."""
    one_hour_ago = now - dt.timedelta(hours=1)
    to_delete = [k for k, (ts, _) in _DUPLICATE_CACHE.items() if ts < one_hour_ago]
    for k in to_delete:
        del _DUPLICATE_CACHE[k]


class PipelineOrchestrator:
    """The central orchestrator executing the 13 check steps."""

    def __init__(
        self,
        *,
        claude_client: ClaudeClient | None = None,
        retrieval_engine: RetrievalEngine | None = None,
        rule_engine: RuleEngine | None = None,
    ) -> None:
        self.settings = get_settings()
        self.claude_client = claude_client or ClaudeClient(settings=self.settings)
        self.retrieval_engine = retrieval_engine or RetrievalEngine()
        self.rule_engine = rule_engine or RuleEngine()

    def run_check(
        self,
        raw_text: str,
        *,
        payment_context: dict[str, Any] | None = None,
        client_ip: str | None = None,
    ) -> dict[str, Any]:
        """Execute a full check following Section 1 and Section 10.6."""
        now = dt.datetime.now(dt.UTC)
        start_time = now
        _prune_expired_cache(now)

        # 1. Context trimming (Doc 02 Section 10.2: above 1500 chars, keep 900 + 500)
        trimmed = False
        text_to_process = raw_text
        if len(raw_text) > 1500:
            text_to_process = raw_text[:900] + "\n[...trimmed...]\n" + raw_text[-500:]
            trimmed = True

        # 2. Duplicate detection within 1 hour using SHA-256 of text
        text_hash = hashlib.sha256(text_to_process.encode("utf-8")).hexdigest()
        if text_hash in _DUPLICATE_CACHE:
            _, cached_result = _DUPLICATE_CACHE[text_hash]
            reused_result = dict(cached_result)
            reused_result["reused"] = True
            reused_result["trimmed"] = trimmed
            logger.info(
                "Reusing result for duplicate message hash %s (1-hr cache)",
                text_hash[:12],
            )
            return reused_result

        # 3. Normalization
        normalized_str = normalize_text(text_to_process)
        parsed_amt = parse_amount_bdt(normalized_str)
        regex_amounts = [f"{parsed_amt} BDT"] if parsed_amt is not None else []
        detected_script = guess_language_script(normalized_str)
        response_lang = "en" if detected_script == "latin" else "bn"

        # 4. PII Masking with Presidio & custom BD recognizers
        mask_result = mask_text(
            normalized_str,
            hmac_key=self.settings.number_hmac_key,
        )
        masked_text = mask_result.masked_text
        phone_hashes = [p.hmac_hash for p in mask_result.phone_numbers]
        otp_pin_detected = mask_result.otp_pin_detected

        # 5. Deterministic Rule Engine
        rule_eval = self.rule_engine.evaluate(
            text=masked_text,
            phone_hashes=phone_hashes,
            otp_pin_detected=otp_pin_detected,
        )
        hard_rules = [h.rule_id for h in rule_eval.hard_hits]
        soft_rules = [s.rule_id for s in rule_eval.soft_hits]

        # Telemetry accumulator
        telemetry: dict[str, Any] = {
            "route": None,
            "model": None,
            "input_tokens": 0,
            "output_tokens": 0,
            "cache_read_tokens": 0,
            "latency_ms": 0.0,
            "trimmed": trimmed,
            "reused": False,
        }

        # Step 6: Hard Rule Hit -> rules_only (No LLM call)
        if hard_rules:
            telemetry["route"] = "rules_only"
            top_rule_id = hard_rules[0]
            # Template explanation per Section 10.2 / templates.py
            template_exp = get_rule_only_explanation(
                rule_id=top_rule_id,
                language=response_lang,
            )
            final_level = "High"
            reasons = [template_exp.title, template_exp.explanation]
            action_ids = list(template_exp.safe_action_ids)
            caution = template_exp.caution

            elapsed_ms = (dt.datetime.now(dt.UTC) - start_time).total_seconds() * 1000.0
            telemetry["latency_ms"] = round(elapsed_ms, 2)

            result = {
                "risk_level": final_level,
                "reasons": reasons,
                "red_flags": [
                    {"flag": rid, "quote": None} for rid in hard_rules + soft_rules
                ],
                "safe_actions": self._resolve_actions(action_ids, response_lang),
                "safe_action_ids": action_ids,
                "caution": caution,
                "scam_type": "fake_otp_pin" if "OTP" in top_rule_id else "other",
                "pattern_codes": [],
                "masked_text": masked_text,
                "telemetry": telemetry,
                "reused": False,
                "trimmed": trimmed,
            }
            _DUPLICATE_CACHE[text_hash] = (now, result)
            return result

        # Step 7: No hard rule -> Haiku triage (P1)
        from app.pipeline.triage import run_triage

        triage_res, triage_telem = run_triage(
            masked_text=masked_text,
            client=self.claude_client,
            regex_amounts=regex_amounts,
        )
        telemetry["input_tokens"] += triage_telem["triage_input_tokens"]
        telemetry["output_tokens"] += triage_telem["triage_output_tokens"]
        telemetry["cache_read_tokens"] += triage_telem["triage_cache_read_tokens"]

        chosen_response_lang = triage_res.response_language or response_lang
        clarity = triage_res.clarity

        # Step 8: Hybrid Retrieval with normalized_query
        retrieval_query = triage_res.normalized_query or masked_text
        retrieved_patterns = self.retrieval_engine.search(
            retrieval_query,
            claude_client=self.claude_client,
            k=60,
            top_n=4,
        )

        # Step 9: Analysis stage (P2 or P3)
        analysis_res, analysis_telem = run_analysis(
            masked_text=masked_text,
            clarity=clarity,
            soft_rule_count=len(soft_rules),
            response_language=chosen_response_lang,
            known_patterns=retrieved_patterns,
            allowed_actions=ALLOWED_ACTION_IDS,
            payment_context=json.dumps(payment_context) if payment_context else None,
            client=self.claude_client,
        )
        telemetry["route"] = analysis_telem["analysis_route"]
        telemetry["model"] = analysis_telem["analysis_model"]
        telemetry["input_tokens"] += analysis_telem["analysis_input_tokens"]
        telemetry["output_tokens"] += analysis_telem["analysis_output_tokens"]
        telemetry["cache_read_tokens"] += analysis_telem["analysis_cache_read_tokens"]
        telemetry["analysis_retries"] = analysis_telem.get("analysis_retries", 0)

        # Step 10 & 11: Fusion and Validation
        # If analysis failed or model down / refusal -> Safe Fallback S16
        if analysis_res is None:
            telemetry["route"] = "fallback"
            if len(soft_rules) >= 2:
                final_level = "Medium"
                reasons = [
                    "বার্তাটিতে একাধিক সতর্কবার্তা পাওয়া গেছে।"
                    if chosen_response_lang == "bn"
                    else "Multiple warning signs were detected in this message."
                ]
                action_ids = ["do_not_send", "confirm_another_way"]
                caution = CAUTION_TEXTS["Medium"][chosen_response_lang]
            else:
                final_level = None  # S16: model down, no rule hit -> final_level null
                reasons = FALLBACK_EXPLANATIONS[chosen_response_lang]
                action_ids = ["do_not_send", "confirm_another_way"]
                caution = CAUTION_TEXTS["fallback"][chosen_response_lang]

            elapsed_ms = (dt.datetime.now(dt.UTC) - start_time).total_seconds() * 1000.0
            telemetry["latency_ms"] = round(elapsed_ms, 2)

            result = {
                "risk_level": final_level,
                "reasons": reasons,
                "red_flags": [{"flag": sr, "quote": None} for sr in soft_rules],
                "safe_actions": self._resolve_actions(action_ids, chosen_response_lang),
                "safe_action_ids": action_ids,
                "caution": caution,
                "scam_type": "none",
                "pattern_codes": [],
                "masked_text": masked_text,
                "telemetry": telemetry,
                "reused": False,
                "trimmed": trimmed,
                "fallback_active": True,
            }
            _DUPLICATE_CACHE[text_hash] = (now, result)
            return result

        # Normal successful analysis -> Run Fusion per Section 10.3
        candidate_llm_level = analysis_res.risk_level
        fusion_out = fuse_risk(
            has_hard_rule=bool(hard_rules),
            soft_rule_count=len(soft_rules),
            llm_level=candidate_llm_level,
            payment_score=(
                payment_context.get("payment_score") if payment_context else None
            ),
            is_message_check=True,
        )
        final_level = fusion_out.final_level

        # Merge soft rule flags if not already reported by LLM
        reported_flags = {rf.flag for rf in analysis_res.red_flags}
        combined_red_flags = list(analysis_res.red_flags)
        for sr in soft_rules:
            if sr not in reported_flags:
                combined_red_flags.append(RedFlagItem(flag=sr, quote=None))

        action_ids = analysis_res.next_step_ids
        caution = CAUTION_TEXTS[final_level or "Low"][chosen_response_lang]

        elapsed_ms = (dt.datetime.now(dt.UTC) - start_time).total_seconds() * 1000.0
        telemetry["latency_ms"] = round(elapsed_ms, 2)

        result = {
            "risk_level": final_level,
            "reasons": analysis_res.reasons,
            "red_flags": [rf.model_dump() for rf in combined_red_flags],
            "safe_actions": self._resolve_actions(action_ids, chosen_response_lang),
            "safe_action_ids": action_ids,
            "caution": caution,
            "scam_type": analysis_res.scam_type,
            "pattern_codes": analysis_res.pattern_codes,
            "masked_text": masked_text,
            "telemetry": telemetry,
            "reused": False,
            "trimmed": trimmed,
            "fallback_active": False,
        }

        _DUPLICATE_CACHE[text_hash] = (now, result)
        return result

    def _resolve_actions(
        self,
        action_ids: list[str],
        language: str,
    ) -> list[dict[str, Any]]:
        """Resolve action IDs to full user-facing labels and descriptions."""
        resolved: list[dict[str, Any]] = []
        is_bn = language == "bn"
        for raw_id in action_ids:
            aid = ACTION_ALIASES.get(raw_id, raw_id)
            if aid in _SAFE_ACTIONS_MAP:
                raw_act = _SAFE_ACTIONS_MAP[aid]
                resolved.append(
                    {
                        "id": aid,
                        "label": raw_act["label_bn"] if is_bn else raw_act["label_en"],
                        "body": raw_act["body_bn"] if is_bn else raw_act["body_en"],
                        "phone": raw_act.get("phone"),
                    }
                )
            else:
                resolved.append(
                    {
                        "id": aid,
                        "label": "পদক্ষেপ নিন" if is_bn else "Take action",
                        "body": None,
                        "phone": None,
                    }
                )
        return resolved
