"""Opaque token generation and hashing.

Session tokens and one-time auth tokens are 256-bit random values. Only their
SHA-256 hash (64 hex chars) is ever persisted, so a database leak does not expose
a usable credential (Doc 02 Section 7).
"""

from __future__ import annotations

import hashlib
import hmac
import secrets


def new_token() -> str:
    """Return a fresh URL-safe 256-bit random token."""
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    """SHA-256 hex digest of a token (what we store and look up by)."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def tokens_equal(a: str, b: str) -> bool:
    """Constant-time comparison of two hex digests."""
    return hmac.compare_digest(a, b)
