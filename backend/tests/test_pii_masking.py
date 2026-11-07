"""PII masking leak tests against 40+ fixture strings and honest R07 reporting."""

import hashlib
import json
import re
from pathlib import Path

import pytest
from app.pipeline.masking import (
    compute_phone_hmac,
    format_masked_phone_display,
    mask_text,
)

FIXTURES_PATH = Path(__file__).parent / "fixtures" / "pii_fixtures.json"


@pytest.fixture(scope="module")
def pii_fixtures() -> list[dict]:
    with open(FIXTURES_PATH, encoding="utf-8") as f:
        data = json.load(f)
    assert len(data) >= 40, f"Expected at least 40 PII fixtures, found {len(data)}"
    return data


# Strict patterns that MUST NEVER leak into masked text:
# 1. BD mobile numbers (11 digits, optional +880 or 880) in ASCII or Bengali digits
PHONE_LEAK_REGEX = re.compile(
    r"(?:(?:\+?880|880)[\s-]?)?0?1[3-9০-৯\d]{2}[\s-]?[0-9০-৯\d]{3}[\s-]?[0-9০-৯\d]{3}\b"
)

# 2. Email addresses
EMAIL_LEAK_REGEX = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b")

# 3. URL query strings with parameters
URL_PARAM_LEAK_REGEX = re.compile(r"https?://[^\s]*\?[^\s]+")

# 4. Long numeric runs (10, 13, 17 digit NIDs / account numbers)
LONG_DIGIT_RUN_REGEX = re.compile(r"\b[0-9০-৯]{10,17}\b")


def test_pii_fixture_count(pii_fixtures):
    assert len(pii_fixtures) >= 40


def test_zero_leaks_across_pii_fixtures(pii_fixtures):
    """Assert 0 PII leaks across all fixtures and report R07 misses honestly."""
    hmac_key = "test-verification-hmac-key"
    total_fixtures = len(pii_fixtures)
    leaks_found: list[dict] = []
    r07_bangla_name_misses: list[dict] = []

    for item in pii_fixtures:
        f_id = item["id"]
        raw_text = item["text"]
        pii_types = item.get("pii_types", [])

        result = mask_text(raw_text, hmac_key=hmac_key)
        masked = result.masked_text

        # 1. Check for Phone Number Leaks
        text_without_placeholders = re.sub(r"\[[A-Z]+_\d+\]", "", masked)

        phone_leaks = PHONE_LEAK_REGEX.findall(text_without_placeholders)
        if phone_leaks:
            leaks_found.append(
                {
                    "id": f_id,
                    "type": "PHONE_LEAK",
                    "leaked": phone_leaks,
                    "masked": masked,
                }
            )

        # 2. Check for Email Leaks
        email_leaks = EMAIL_LEAK_REGEX.findall(text_without_placeholders)
        if email_leaks:
            leaks_found.append(
                {
                    "id": f_id,
                    "type": "EMAIL_LEAK",
                    "leaked": email_leaks,
                    "masked": masked,
                }
            )

        # 3. Check for URL Query String Leaks
        url_param_leaks = URL_PARAM_LEAK_REGEX.findall(text_without_placeholders)
        if url_param_leaks:
            leaks_found.append(
                {
                    "id": f_id,
                    "type": "URL_PARAM_LEAK",
                    "leaked": url_param_leaks,
                    "masked": masked,
                }
            )

        # 4. Check for OTP/PIN Leaks when expected
        if "OTP" in pii_types or "PIN" in pii_types:
            assert (
                result.otp_pin_detected
            ), f"Fixture {f_id} expected OTP/PIN detection but got False"

        # 5. Check NID / Account leaks
        if "NID" in pii_types or "ACCOUNT" in pii_types:
            long_runs = LONG_DIGIT_RUN_REGEX.findall(text_without_placeholders)
            if long_runs:
                leaks_found.append(
                    {
                        "id": f_id,
                        "type": "NID_OR_ACCOUNT_LEAK",
                        "leaked": long_runs,
                        "masked": masked,
                    }
                )

        # 6. Honest R07 reporting: Track unmasked Bangla names
        if "UNLABELED_NAME" in pii_types:
            # Presidio has no native Bangla NER model. We document this open risk.
            r07_bangla_name_misses.append(
                {
                    "id": f_id,
                    "raw_text": raw_text,
                    "masked_text": masked,
                    "reason": (
                        "Unlabeled Bangla name without honorific prefix cannot be "
                        "resolved by regex without a full Bangla NER model."
                    ),
                }
            )

    # Print R07 honest miss report for transparency
    print("\n" + "=" * 70)
    print("PROHORI R07 PII AUDIT REPORT — BANGLA NAME NER EVALUATION")
    print("=" * 70)
    print(f"Total fixtures evaluated: {total_fixtures}")
    print(f"PII Leaks detected: {len(leaks_found)}")
    print(f"R07 Honest Bangla-Name Misses reported: {len(r07_bangla_name_misses)}")
    for miss in r07_bangla_name_misses:
        print(f"  - [{miss['id']}]: '{miss['raw_text']}'")
        print(f"    Masked result: '{miss['masked_text']}'")
        print(f"    Risk note: {miss['reason']}")
    print("=" * 70 + "\n")

    # Assert 0 leaks on sensitive PII
    assert len(leaks_found) == 0, f"Detected PII leaks in fixtures: {leaks_found}"


def test_stable_placeholders():
    text = "Call 01712345678 or 01712345678 again, and then 01811223344."
    res = mask_text(text, hmac_key="key123")
    # Repeated number should reuse [PHONE_1]
    assert "[PHONE_1]" in res.masked_text
    assert "[PHONE_2]" in res.masked_text
    assert res.masked_text.count("[PHONE_1]") == 2
    assert res.masked_text.count("[PHONE_2]") == 1


def test_hmac_and_display_format():
    key = "secret-test-key"
    canonical = "+8801712345678"
    h_hash = compute_phone_hmac(key, canonical)
    display = format_masked_phone_display(canonical)

    # Must be 64-character hex HMAC-SHA256
    assert len(h_hash) == 64
    assert re.match(r"^[0-9a-f]{64}$", h_hash)
    # Never equal plain SHA-256
    assert h_hash != hashlib.sha256(canonical.encode()).hexdigest()

    # Safe display format: +880 17** ***678
    assert display == "+880 17** ***678"
