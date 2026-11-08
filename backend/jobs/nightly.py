"""Nightly batch job entry point."""

from __future__ import annotations

import sys
from pathlib import Path

# Add backend directory to sys.path if not present
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.jobs.nightly import main  # noqa: E402

if __name__ == "__main__":
    main()
