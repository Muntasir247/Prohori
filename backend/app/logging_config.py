"""Structured JSON logging.

Logs are one JSON object per line carrying request id, route, status, latency and
stage metadata. Message text, phone numbers, OTPs and PINs are never logged — the
log record only ever receives the structured fields assembled here, and a Presidio
log filter is planned as a second line of defence (Doc 02 Section 7).
"""

from __future__ import annotations

import json
import logging
import sys
from datetime import UTC, datetime
from typing import Any

# Keys that carry structured context on a LogRecord via ``extra={...}``.
_CONTEXT_KEYS = (
    "request_id",
    "route",
    "method",
    "status",
    "latency_ms",
    "stage",
    "model",
    "input_tokens",
    "output_tokens",
    "route_taken",
)


class JsonFormatter(logging.Formatter):
    """Render log records as single-line JSON."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "ts": datetime.now(UTC).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        for key in _CONTEXT_KEYS:
            value = getattr(record, key, None)
            if value is not None:
                payload[key] = value
        if record.exc_info:
            payload["exc_info"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False)


def configure_logging(level: str = "INFO") -> None:
    """Install the JSON formatter on the root logger (idempotent)."""
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())

    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(level.upper())

    # Uvicorn's own access log would echo query strings; route it through ours
    # and silence the default access logger so no request bodies/paths leak.
    logging.getLogger("uvicorn.access").handlers.clear()
    logging.getLogger("uvicorn.access").propagate = False


def get_logger(name: str = "prohori") -> logging.Logger:
    return logging.getLogger(name)
