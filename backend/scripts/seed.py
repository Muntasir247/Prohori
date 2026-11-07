"""Seed simulated data.

The real seed (scam types, safe actions, knowledge base, simulated checks/cases)
is built in Phase 03 — see docs/PROGRESS.md. This entrypoint exists so `make seed`
resolves; it exits non-zero rather than pretend to have seeded anything.
"""

from __future__ import annotations

import sys


def main() -> int:
    print("seed: not implemented yet — scheduled for Phase 03 (database and seed).")
    return 1


if __name__ == "__main__":
    sys.exit(main())
