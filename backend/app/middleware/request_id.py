"""Request-ID and access-logging middleware.

Assigns (or honours an inbound ``X-Request-ID``), stashes it on
``request.state.request_id`` so handlers and the error handler can read it, and
emits one JSON access log line per request. The log carries method, route
*template* (never the raw path with its query string), status and latency.
"""

from __future__ import annotations

import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from app.logging_config import get_logger

_HEADER = "X-Request-ID"
_logger = get_logger("prohori.access")


def _route_template(request: Request) -> str:
    """The matched route pattern, or ``<unmatched>`` — never the query string."""
    route = request.scope.get("route")
    return getattr(route, "path", None) or "<unmatched>"


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        inbound = request.headers.get(_HEADER)
        request_id = inbound if inbound and len(inbound) <= 64 else uuid.uuid4().hex
        request.state.request_id = request_id

        start = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            latency_ms = int((time.perf_counter() - start) * 1000)
            _logger.exception(
                "request_failed",
                extra={
                    "request_id": request_id,
                    "method": request.method,
                    "route": _route_template(request),
                    "latency_ms": latency_ms,
                },
            )
            raise

        latency_ms = int((time.perf_counter() - start) * 1000)
        response.headers[_HEADER] = request_id
        _logger.info(
            "request",
            extra={
                "request_id": request_id,
                "method": request.method,
                "route": _route_template(request),
                "status": response.status_code,
                "latency_ms": latency_ms,
            },
        )
        return response
