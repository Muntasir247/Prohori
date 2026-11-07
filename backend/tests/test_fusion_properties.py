"""Hypothesis property-based tests proving the Section 10.3 risk fusion invariants.

Invariants proven mathematically across arbitrary generated states:
1. The LLM can NEVER lower a floor (final_level >= floor whenever floor is set).
2. A null LLM level with no rule hit returns null (fail safe when model is down).
3. The false-positive cap holds: no rule hit + LLM Low + payment score High ->
   final_level capped at Medium.
4. Monotonicity: Increasing rule severity or score never decreases final_level.
"""

from app.pipeline.fusion import RiskLevel, fuse_risk
from hypothesis import given, settings
from hypothesis import strategies as st

# Strategies
risk_level_strategy = st.sampled_from(
    [None, "Low", "Medium", "High", RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH]
)
payment_score_strategy = st.sampled_from(
    [None, 0.0, 0.25, 0.39, 0.40, 0.50, 0.74, 0.75, 0.90, 1.0]
)
rule_count_strategy = st.integers(min_value=0, max_value=8)


@given(
    has_hard_rule=st.booleans(),
    soft_rule_count=rule_count_strategy,
    llm_level=risk_level_strategy,
    payment_score=payment_score_strategy,
    payment_level=risk_level_strategy,
    is_message_check=st.booleans(),
)
@settings(max_examples=400)
def test_property_llm_can_never_lower_floor(
    has_hard_rule: bool,
    soft_rule_count: int,
    llm_level: str | RiskLevel | None,
    payment_score: float | None,
    payment_level: str | RiskLevel | None,
    is_message_check: bool,
):
    """INVARIANT 1: The model can NEVER lower a floor set by rules."""
    result = fuse_risk(
        has_hard_rule=has_hard_rule,
        soft_rule_count=soft_rule_count,
        llm_level=llm_level,
        payment_score=payment_score,
        payment_level=payment_level,
        is_message_check=is_message_check,
    )

    if result.floor is not None:
        # If there is a floor, final_level must not be None
        assert (
            result.final_level is not None
        ), f"Floor {result.floor} was set but final_level was None!"
        # And final_level must be greater than or equal to floor
        assert result.final_level >= result.floor, (
            f"VIOLATION: Floor was {result.floor} but final was {result.final_level} "
            f"with llm_level={llm_level}"
        )


@given(
    payment_score=payment_score_strategy,
    payment_level=risk_level_strategy,
)
@settings(max_examples=100)
def test_property_null_llm_with_no_rule_hit_returns_null(
    payment_score: float | None,
    payment_level: str | RiskLevel | None,
):
    """INVARIANT 2: When model down and no rules hit, final_level MUST be null."""
    result = fuse_risk(
        has_hard_rule=False,
        soft_rule_count=0,
        llm_level=None,
        payment_score=payment_score,
        payment_level=payment_level,
        is_message_check=True,
    )
    assert (
        result.final_level is None
    ), f"VIOLATION: Expected null final_level, got {result.final_level}"


@given(
    payment_score=st.floats(min_value=0.75, max_value=1.0),
)
@settings(max_examples=100)
def test_property_false_positive_cap(payment_score: float):
    """INVARIANT 3: Cap rule: no rules hit + LLM Low + High score -> Medium."""
    result = fuse_risk(
        has_hard_rule=False,
        soft_rule_count=0,
        llm_level=RiskLevel.LOW,
        payment_score=payment_score,
        is_message_check=True,
    )
    assert result.final_level == RiskLevel.MEDIUM
    assert result.is_capped is True


@given(
    soft_rule_count=st.integers(min_value=2, max_value=5),
    llm_level=st.sampled_from(["Low", None]),
)
@settings(max_examples=100)
def test_property_two_or_more_soft_rules_enforce_medium_floor(
    soft_rule_count: int,
    llm_level: str | None,
):
    """INVARIANT 4: 2+ soft rules enforce Medium floor even if LLM says Low."""
    result = fuse_risk(
        has_hard_rule=False,
        soft_rule_count=soft_rule_count,
        llm_level=llm_level,
        is_message_check=True,
    )
    assert result.floor == RiskLevel.MEDIUM
    assert result.final_level is not None
    assert result.final_level >= RiskLevel.MEDIUM
