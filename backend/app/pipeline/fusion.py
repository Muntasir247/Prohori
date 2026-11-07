"""Pure functional risk fusion implementing Doc 02 Section 10.3 table.

Table from Section 10.3:
Step 1: Hard rule: asks for OTP, PIN or password; or a reviewer-confirmed
        risky number -> Floor High
Step 2: Two or more soft rules: urgency, impersonation, link or number mismatch,
        unusual amount -> Floor Medium
Step 3: LLM level -> Candidate
Step 4: Payment score: under 0.40 Low, 0.40–0.74 Medium, 0.75 and over High
Step 5: Take the highest of floor and candidates -> Draft level
Step 6: Cap: if message check has no rule hit and LLM says Low, a High from
        score alone becomes Medium -> Final level
Step 7: LLM may raise a level but can never lower a floor -> Enforced
Step 8: Model down, no rule hit -> final_level null, S16

Properties proven by tests:
1. The LLM can never lower a floor.
2. A null LLM level with no rule hit returns null.
3. High score alone without rule hits is capped to Medium when LLM says Low.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Literal

RiskLevelStr = Literal["Low", "Medium", "High"]


class RiskLevel(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"

    def __lt__(self, other: object) -> bool:
        if not isinstance(other, RiskLevel):
            return NotImplemented
        order = {RiskLevel.LOW: 1, RiskLevel.MEDIUM: 2, RiskLevel.HIGH: 3}
        return order[self] < order[other]

    def __le__(self, other: object) -> bool:
        if not isinstance(other, RiskLevel):
            return NotImplemented
        order = {RiskLevel.LOW: 1, RiskLevel.MEDIUM: 2, RiskLevel.HIGH: 3}
        return order[self] <= order[other]

    def __gt__(self, other: object) -> bool:
        if not isinstance(other, RiskLevel):
            return NotImplemented
        order = {RiskLevel.LOW: 1, RiskLevel.MEDIUM: 2, RiskLevel.HIGH: 3}
        return order[self] > order[other]

    def __ge__(self, other: object) -> bool:
        if not isinstance(other, RiskLevel):
            return NotImplemented
        order = {RiskLevel.LOW: 1, RiskLevel.MEDIUM: 2, RiskLevel.HIGH: 3}
        return order[self] >= order[other]


def score_to_candidate_level(score: float | None) -> RiskLevel | None:
    """Map payment score [0.0, 1.0] to candidate RiskLevel (Section 10.3 Step 4)."""
    if score is None:
        return None
    if score < 0.40:
        return RiskLevel.LOW
    if score < 0.75:
        return RiskLevel.MEDIUM
    return RiskLevel.HIGH


def _parse_level(val: RiskLevel | str | None) -> RiskLevel | None:
    if val is None:
        return None
    if isinstance(val, RiskLevel):
        return val
    clean = str(val).strip().capitalize()
    if clean in ("Low", "Medium", "High"):
        return RiskLevel(clean)
    return None


@dataclass(frozen=True)
class FusionResult:
    """Immutable output of the risk fusion pure function."""

    final_level: RiskLevel | None
    floor: RiskLevel | None
    draft_level: RiskLevel | None
    llm_candidate: RiskLevel | None
    payment_candidate: RiskLevel | None
    is_capped: bool = False
    reasons: list[str] = field(default_factory=list)

    @property
    def level_str(self) -> str | None:
        return self.final_level.value if self.final_level else None


def fuse_risk(
    *,
    has_hard_rule: bool = False,
    soft_rule_count: int = 0,
    llm_level: RiskLevel | str | None = None,
    payment_score: float | None = None,
    payment_level: RiskLevel | str | None = None,
    is_message_check: bool = True,
) -> FusionResult:
    """Execute risk fusion as a deterministic, pure function.

    Implements Doc 02 Section 10.3 Steps 1 through 8.
    """
    reasons: list[str] = []
    parsed_llm = _parse_level(llm_level)
    parsed_payment = _parse_level(payment_level) or score_to_candidate_level(
        payment_score
    )

    has_any_rule = has_hard_rule or (soft_rule_count > 0)

    # Step 1: Hard rule -> Floor High
    # Step 2: Two or more soft rules -> Floor Medium
    floor: RiskLevel | None = None
    if has_hard_rule:
        floor = RiskLevel.HIGH
        reasons.append(
            "Hard rule triggered (credential request or confirmed risky number)"
        )
    elif soft_rule_count >= 2:
        floor = RiskLevel.MEDIUM
        reasons.append(
            f"Multiple soft rules triggered ({soft_rule_count} rules matched)"
        )

    # Step 8: Model down, no rule hit -> final_level null, S16
    # If this is a message check where LLM is missing and no rules hit, fail safe
    if is_message_check and parsed_llm is None and not has_any_rule:
        return FusionResult(
            final_level=None,
            floor=floor,
            draft_level=None,
            llm_candidate=None,
            payment_candidate=parsed_payment,
            is_capped=False,
            reasons=["Model down and no rules triggered: safe fallback to null level"],
        )

    # Step 5: Draft level is the highest of floor and candidates
    candidates: list[RiskLevel] = []
    if floor is not None:
        candidates.append(floor)
    if parsed_llm is not None:
        candidates.append(parsed_llm)
    if parsed_payment is not None:
        candidates.append(parsed_payment)

    if not candidates:
        draft_level = None
        final_level = None
        return FusionResult(
            final_level=None,
            floor=floor,
            draft_level=None,
            llm_candidate=parsed_llm,
            payment_candidate=parsed_payment,
            is_capped=False,
            reasons=reasons,
        )

    draft_level = max(candidates)

    # Step 6: Cap: if message check has no rule hit and LLM says Low,
    # a High from score alone becomes Medium
    is_capped = False
    if (
        is_message_check
        and not has_any_rule
        and parsed_llm == RiskLevel.LOW
        and draft_level == RiskLevel.HIGH
        and parsed_payment == RiskLevel.HIGH
    ):
        final_level = RiskLevel.MEDIUM
        is_capped = True
        reasons.append(
            "Capped: High payment score reduced to Medium because message has "
            "no rule hits and LLM assessed Low"
        )
    else:
        final_level = draft_level

    # Step 7: Enforce that LLM may raise a level but can NEVER lower a floor
    if floor is not None and final_level is not None:
        if final_level < floor:
            # Invariant assertion
            final_level = floor

    return FusionResult(
        final_level=final_level,
        floor=floor,
        draft_level=draft_level,
        llm_candidate=parsed_llm,
        payment_candidate=parsed_payment,
        is_capped=is_capped,
        reasons=reasons,
    )
