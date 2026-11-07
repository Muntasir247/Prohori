"""Deterministic rule engine for fraud pattern detection.

Executes hard and soft rules against normalized and masked message text,
applying the floor logic defined in Doc 02 Section 10.3:
- Hard rule: asks for OTP/PIN/password, or confirmed risky number -> Floor High
- Two or more soft rules -> Floor Medium
- Otherwise -> No floor (None)
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml

from app.pipeline.normalize import normalize_text


@dataclass(frozen=True)
class RuleHit:
    """A single rule activation."""

    rule_id: str
    rule_type: str  # 'hard' | 'soft'
    category: str
    name: str
    description: str
    matched_pattern: str | None = None


@dataclass
class RuleEngineResult:
    """The outcome of evaluating rules against an input message."""

    hard_hits: list[RuleHit] = field(default_factory=list)
    soft_hits: list[RuleHit] = field(default_factory=list)
    floor: str | None = None  # 'High' | 'Medium' | None

    @property
    def has_hard_hit(self) -> bool:
        return len(self.hard_hits) > 0

    @property
    def has_rule_hit(self) -> bool:
        return len(self.hard_hits) > 0 or len(self.soft_hits) > 0

    @property
    def rule_ids(self) -> list[str]:
        return [h.rule_id for h in self.hard_hits] + [s.rule_id for s in self.soft_hits]


class RuleEngine:
    """Loads YAML rule definitions and evaluates them deterministically."""

    def __init__(self, rules_path: Path | str | None = None) -> None:
        if rules_path is None:
            rules_path = Path(__file__).parent / "rules.yaml"
        self.rules_path = Path(rules_path)
        self._rules = self._load_rules()
        self._compiled_patterns: dict[str, list[tuple[str, re.Pattern[str]]]] = (
            self._compile_patterns()
        )

    def _load_rules(self) -> list[dict[str, Any]]:
        if not self.rules_path.exists():
            raise FileNotFoundError(
                f"Rules definition file not found: {self.rules_path}"
            )
        with open(self.rules_path, encoding="utf-8") as f:
            data = yaml.safe_load(f)
        return data.get("rules", [])

    def _compile_patterns(self) -> dict[str, list[tuple[str, re.Pattern[str]]]]:
        compiled: dict[str, list[tuple[str, re.Pattern[str]]]] = {}
        for rule in self._rules:
            r_id = rule["id"]
            compiled[r_id] = []
            patterns_by_lang = rule.get("patterns", {})
            for lang, pat_list in patterns_by_lang.items():
                for pat in pat_list:
                    compiled[r_id].append(
                        (lang, re.compile(pat, re.UNICODE | re.MULTILINE))
                    )
        return compiled

    def evaluate(
        self,
        text: str,
        *,
        phone_hashes: list[str] | None = None,
        risky_number_hashes: set[str] | None = None,
        otp_pin_detected: bool = False,
    ) -> RuleEngineResult:
        """Evaluate all rules against the text and parameters.

        Args:
            text: Normalized or masked text.
            phone_hashes: HMAC-SHA256 hashes of phone numbers found in the text.
            risky_number_hashes: Set of known confirmed_risky HMAC-SHA256 hashes.
            otp_pin_detected: Whether masking already dropped an OTP/PIN code.
        """
        norm_text = normalize_text(text)
        hard_hits: list[RuleHit] = []
        soft_hits: list[RuleHit] = []

        phone_hashes_set = set(phone_hashes or [])
        risky_hashes_set = set(risky_number_hashes or [])

        # Request verbs that indicate an active ask when otp_pin_detected is True
        ask_verbs_pattern = re.compile(
            r"(?i)(?:পাঠান|দিন|বলুন|উত্তর\s*দিন|শেয়ার|সেন্ড|পাঠাইয়েন|send|share|give|provide|read|forward|enter|confirm|reply|pathan|pathao|dao|din|send\s*koren)",
            re.UNICODE,
        )

        for rule in self._rules:
            r_id = rule["id"]
            r_type = rule["type"]
            hit: RuleHit | None = None

            # Special Hard Rule 1: HARD_CONFIRMED_RISKY_NUMBER
            if r_id == "HARD_CONFIRMED_RISKY_NUMBER":
                if phone_hashes_set and risky_hashes_set:
                    overlap = phone_hashes_set.intersection(risky_hashes_set)
                    if overlap:
                        hit = RuleHit(
                            rule_id=r_id,
                            rule_type="hard",
                            category=rule.get("category", "known_offender"),
                            name=rule.get("name", "Confirmed Risky Number"),
                            description=rule.get("description", ""),
                            matched_pattern=f"hash_match:{next(iter(overlap))[:12]}...",
                        )

            # Special Hard Rule 2: HARD_OTP_PIN_PASSWORD
            elif r_id == "HARD_OTP_PIN_PASSWORD":
                # Check regex patterns
                for _lang, c_pat in self._compiled_patterns.get(r_id, []):
                    m = c_pat.search(norm_text)
                    if m:
                        hit = RuleHit(
                            rule_id=r_id,
                            rule_type="hard",
                            category=rule.get("category", "credential_theft"),
                            name=rule.get("name", "Asks for OTP, PIN or password"),
                            description=rule.get("description", ""),
                            matched_pattern=m.group(0),
                        )
                        break

                # Masking found OTP/PIN and asking verb is present
                if hit is None and otp_pin_detected:
                    m_ask = ask_verbs_pattern.search(norm_text)
                    if m_ask:
                        hit = RuleHit(
                            rule_id=r_id,
                            rule_type="hard",
                            category=rule.get("category", "credential_theft"),
                            name=rule.get("name", "Asks for OTP, PIN or password"),
                            description=rule.get("description", ""),
                            matched_pattern=f"otp_detected_with_verb:{m_ask.group(0)}",
                        )

            # Standard Pattern Rules (Soft rules & others)
            else:
                for _lang, c_pat in self._compiled_patterns.get(r_id, []):
                    m = c_pat.search(norm_text)
                    if m:
                        hit = RuleHit(
                            rule_id=r_id,
                            rule_type=r_type,
                            category=rule.get("category", "general"),
                            name=rule.get("name", r_id),
                            description=rule.get("description", ""),
                            matched_pattern=m.group(0),
                        )
                        break

            if hit:
                if r_type == "hard":
                    hard_hits.append(hit)
                else:
                    soft_hits.append(hit)

        # Floor computation according to Doc 02 Section 10.3:
        # Step 1: Hard rule -> Floor High
        # Step 2: Two or more soft rules -> Floor Medium
        if hard_hits:
            floor = "High"
        elif len(soft_hits) >= 2:
            floor = "Medium"
        else:
            floor = None

        return RuleEngineResult(
            hard_hits=hard_hits,
            soft_hits=soft_hits,
            floor=floor,
        )


# Global singleton instance
_ENGINE_INSTANCE: RuleEngine | None = None


def get_rule_engine() -> RuleEngine:
    """Return the cached RuleEngine singleton."""
    global _ENGINE_INSTANCE
    if _ENGINE_INSTANCE is None:
        _ENGINE_INSTANCE = RuleEngine()
    return _ENGINE_INSTANCE
