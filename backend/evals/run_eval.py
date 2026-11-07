"""Evaluation harness entrypoint.

The labelled regression set and grader (Doc 02 F25) are built in Phase 12. This
entrypoint exists so `make eval` resolves; it exits non-zero rather than report
metrics it has not computed.
"""

from __future__ import annotations

import sys


def main() -> int:
    print("eval: not implemented yet — scheduled for Phase 12 (evaluation).")
    return 1


if __name__ == "__main__":
    sys.exit(main())
