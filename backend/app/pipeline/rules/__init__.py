"""Rule engine: regex/keyword rules and known-number lookup."""

from app.pipeline.rules.engine import (
    RuleEngine,
    RuleEngineResult,
    RuleHit,
    get_rule_engine,
)

__all__ = [
    "RuleEngine",
    "RuleEngineResult",
    "RuleHit",
    "get_rule_engine",
]
