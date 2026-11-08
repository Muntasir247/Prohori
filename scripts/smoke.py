"""Root shortcut to run smoke_prod.py.

Usage:
    python scripts/smoke.py --base-url <url>
"""

from __future__ import annotations

import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from scripts.smoke_prod import main

if __name__ == "__main__":
    main()

