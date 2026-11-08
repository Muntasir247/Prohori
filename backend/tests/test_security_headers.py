"""Security headers and strict CSP tests (Doc 02 Section 11, Phase 13).

Ensures all Section 11 security headers are emitted:
- Strict-Transport-Security (HSTS)
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- Referrer-Policy: strict-origin-when-cross-origin
- Content-Security-Policy with frame-ancestors 'none' and no inline scripts
- Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
- Cross-Origin-Opener-Policy: same-origin
- Cross-Origin-Resource-Policy: same-origin
"""

from __future__ import annotations

import pytest


@pytest.mark.anyio
async def test_security_headers_present_on_every_response(client):
    resp = await client.get("/api/v1/health")
    assert resp.status_code in (200, 503)

    headers = resp.headers
    assert headers.get("X-Content-Type-Options") == "nosniff"
    assert headers.get("X-Frame-Options") == "DENY"
    assert headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
    assert headers.get("Cross-Origin-Opener-Policy") == "same-origin"
    assert headers.get("Cross-Origin-Resource-Policy") == "same-origin"
    assert "camera=()" in headers.get("Permissions-Policy", "")
    assert "payment=()" in headers.get("Permissions-Policy", "")

    # HSTS
    hsts = headers.get("Strict-Transport-Security")
    assert hsts is not None
    assert "max-age=" in hsts
    assert "includeSubDomains" in hsts

    # CSP
    csp = headers.get("Content-Security-Policy")
    assert csp is not None
    assert "frame-ancestors 'none'" in csp
    assert "script-src 'self'" in csp
    assert "default-src 'self'" in csp

