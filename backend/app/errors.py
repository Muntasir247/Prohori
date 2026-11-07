"""Application error type and the standard error envelope.

The envelope shape is fixed by ``docs/PROHORI_DOC02.md`` Section 7::

    {"error": {"code": "...", "message_key": "...", "fields": {},
               "request_id": "...", "retry_after": 120}}
"""

from __future__ import annotations

from typing import Any


class AppError(Exception):
    """A domain error that maps cleanly onto the HTTP error envelope.

    ``code`` is a stable machine string, ``message_key`` an i18n lookup key the
    frontend resolves to Bangla/English copy. No human sentence is placed here,
    so nothing user-facing is hard-coded on the backend.
    """

    def __init__(
        self,
        code: str,
        *,
        status: int = 400,
        message_key: str | None = None,
        fields: dict[str, str] | None = None,
        retry_after: int | None = None,
    ) -> None:
        super().__init__(code)
        self.code = code
        self.status = status
        self.message_key = message_key or f"errors.{code}"
        self.fields = fields or {}
        self.retry_after = retry_after

    def envelope(self, request_id: str) -> dict[str, Any]:
        error: dict[str, Any] = {
            "code": self.code,
            "message_key": self.message_key,
            "fields": self.fields,
            "request_id": request_id,
        }
        if self.retry_after is not None:
            error["retry_after"] = self.retry_after
        return {"error": error}


def envelope_from_parts(
    *,
    code: str,
    request_id: str,
    message_key: str | None = None,
    fields: dict[str, str] | None = None,
    retry_after: int | None = None,
) -> dict[str, Any]:
    """Build an error envelope without raising (used by the global handler)."""
    error: dict[str, Any] = {
        "code": code,
        "message_key": message_key or f"errors.{code}",
        "fields": fields or {},
        "request_id": request_id,
    }
    if retry_after is not None:
        error["retry_after"] = retry_after
    return {"error": error}
