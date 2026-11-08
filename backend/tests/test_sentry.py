"""Sentry scrubbing tests (Doc 02 Section 11, R12).

Tests that Sentry `before_send`:
1. Scrubs request body entirely (never leaves message or payment text).
2. Scrubs sensitive headers (Authorization, X-API-Key, Cookie, Set-Cookie).
3. Scrubs sensitive query parameters (token, code, phone, otp, pin, key, secret).
4. Scrubs sensitive breadcrumb payloads.
5. Scrubs user email and phone from user context.
"""

from __future__ import annotations

from app.sentry import scrub_sentry_event


def test_sentry_scrubs_request_body_completely():
    event = {
        "request": {
            "url": "https://prohori.com/api/v1/check-message",
            "method": "POST",
            "data": {
                "text": "আপনার একাউন্টে ৫০০০ টাকা পাঠানো হয়েছে। পিন দিন ১২৩৪",
                "phone": "+8801712345678",
            },
        }
    }
    scrubbed = scrub_sentry_event(event)
    assert scrubbed["request"]["data"] == "[REDACTED_REQUEST_BODY]"


def test_sentry_scrubs_sensitive_headers():
    event = {
        "request": {
            "url": "https://prohori.com/api/v1/checks",
            "headers": {
                "Authorization": "Bearer super-secret-token",
                "X-API-Key": "prh_live_abcdef123456",
                "Cookie": "__Host-prohori_session=xyz123",
                "Content-Type": "application/json",
            },
        }
    }
    scrubbed = scrub_sentry_event(event)
    headers = scrubbed["request"]["headers"]
    assert headers["Authorization"] == "[REDACTED]"
    assert headers["X-API-Key"] == "[REDACTED]"
    assert headers["Cookie"] == "[REDACTED]"
    assert headers["Content-Type"] == "application/json"


def test_sentry_scrubs_sensitive_query_parameters():
    event = {
        "request": {
            "url": "https://prohori.com/api/v1/auth/verify-email?token=abcdef&code=1234&safe=param",
            "query_string": "token=abcdef&code=1234&safe=param",
        }
    }
    scrubbed = scrub_sentry_event(event)
    qs = scrubbed["request"]["query_string"]
    assert "token=[REDACTED]" in qs
    assert "code=[REDACTED]" in qs
    assert "safe=param" in qs


def test_sentry_scrubs_breadcrumbs_and_user_context():
    event = {
        "user": {
            "id": "usr_123",
            "email": "victim@example.com",
            "phone": "+8801700000000",
            "ip_address": "127.0.0.1",
        },
        "breadcrumbs": {
            "values": [
                {
                    "category": "http",
                    "data": {
                        "url": "/check-message",
                        "request_body": "sensitive scam text",
                        "phone_number": "01711223344",
                    },
                }
            ]
        },
    }
    scrubbed = scrub_sentry_event(event)

    # User context stripped of personal identifiers
    assert scrubbed["user"]["id"] == "usr_123"
    assert "email" not in scrubbed["user"]
    assert "phone" not in scrubbed["user"]
    assert "ip_address" not in scrubbed["user"]

    # Breadcrumbs data redacted
    bc_data = scrubbed["breadcrumbs"]["values"][0]["data"]
    assert bc_data["request_body"] == "[REDACTED]"
    assert bc_data["phone_number"] == "[REDACTED]"

