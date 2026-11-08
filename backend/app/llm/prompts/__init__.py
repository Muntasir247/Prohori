"""Versioned LLM prompts.

See ``docs/PROHORI_DOC02.md`` Section 10.5.
"""

from __future__ import annotations

from app.llm.prompts import (
    p1_triage_v1 as p1,
)
from app.llm.prompts import (
    p2_analysis_v1 as p2,
)
from app.llm.prompts import (
    p3_payment_v1 as p3,
)
from app.llm.prompts import (
    p5_grader_v1 as p5,
)
from app.llm.prompts import (
    p6_hyde_v1 as p6,
)

__all__ = ["p1", "p2", "p3", "p5", "p6"]
