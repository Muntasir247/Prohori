"""Unit tests for deterministic normalization (normalize.py)."""

from decimal import Decimal

import pytest
from app.pipeline.normalize import (
    ascii_to_bangla_digits,
    bangla_digits_to_ascii,
    extract_phone_numbers,
    guess_language_script,
    normalize_amount,
    normalize_phone_number,
    normalize_text,
    parse_amount_bdt,
)


def test_unicode_nfc_normalization():
    # Composed and decomposed unicode should normalize to identical NFC form
    decomposed = "প\u09bc"  # প + nukta
    composed = "প়"
    assert normalize_text(decomposed) == normalize_text(composed)
    assert normalize_text("  hello   world  \u200b") == "hello   world"


def test_bangla_digits_to_ascii():
    assert bangla_digits_to_ascii("০১২৩৪৫৬৭৮৯") == "0123456789"
    assert bangla_digits_to_ascii("টাকা ৫০,০০০") == "টাকা 50,000"
    assert bangla_digits_to_ascii("০১৭১২৩৪৫৬৭৮") == "01712345678"


def test_ascii_to_bangla_digits():
    assert ascii_to_bangla_digits("0123456789") == "০১২৩৪৫৬৭৮৯"
    assert ascii_to_bangla_digits("500 taka") == "৫০০ taka"


@pytest.mark.parametrize(
    ("raw_text", "expected_decimal"),
    [
        ("500 taka", Decimal("500")),
        ("BDT 1,500", Decimal("1500")),
        ("৳ 2500.50", Decimal("2500.50")),
        ("15000 Tk", Decimal("15000")),
        ("৫০,০০০ টাকা", Decimal("50000")),
        ("1.5 lakh", Decimal("150000")),
        ("১.৫ লাখ", Decimal("150000")),
        ("2 লাখ টাকা", Decimal("200000")),
        ("5 lac", Decimal("500000")),
        ("0.5 lakh", Decimal("50000")),
        ("1 crore", Decimal("10000000")),
        ("১ কোটি টাকা", Decimal("10000000")),
        ("10 হাজার", Decimal("10000")),
        ("2.25 lakh BDT", Decimal("225000")),
        ("1,50,000", Decimal("150000")),
    ],
)
def test_parse_amount_bdt_success(raw_text: str, expected_decimal: Decimal):
    parsed = parse_amount_bdt(raw_text)
    assert parsed is not None
    assert isinstance(parsed, Decimal)
    assert parsed == expected_decimal


def test_parse_amount_no_float_errors():
    # 1.5 lakh should be exact Decimal("150000"), never 150000.00000000003
    amt = parse_amount_bdt("1.5 lakh")
    assert str(amt) == "150000"
    assert amt == Decimal("150000")


def test_normalize_amount_helper():
    assert normalize_amount(Decimal("250")) == Decimal("250")
    assert normalize_amount(1000) == Decimal("1000")
    assert normalize_amount("১.৫ লাখ") == Decimal("150000")
    with pytest.raises(ValueError):
        normalize_amount("invalid amount string")


@pytest.mark.parametrize(
    ("raw_phone", "expected_e164"),
    [
        ("01712345678", "+8801712345678"),
        ("০১৭১২৩৪৫৬৭৮", "+8801712345678"),
        ("+8801812345678", "+8801812345678"),
        ("8801912345678", "+8801912345678"),
        ("01712-345678", "+8801712345678"),
        ("01712 345678", "+8801712345678"),
        ("+৮৮০১৮১২৩৪৫৬৭৮", "+8801812345678"),
        ("01300112233", "+8801300112233"),
        ("01999887766", "+8801999887766"),
    ],
)
def test_normalize_phone_number_success(raw_phone: str, expected_e164: str):
    norm = normalize_phone_number(raw_phone)
    assert norm == expected_e164


def test_normalize_phone_number_invalid():
    assert normalize_phone_number("12345") is None
    assert normalize_phone_number("invalid-phone") is None
    # 012 is not a valid BD mobile operator code (only 013-019)
    assert normalize_phone_number("01212345678") is None


def test_extract_phone_numbers():
    text = "Call 01711223344 or ০১৭১২৩৪৫৬৭৮ for support."
    phones = extract_phone_numbers(text)
    assert "+8801711223344" in phones
    assert "+8801712345678" in phones
    assert len(phones) == 2


def test_guess_language_script():
    assert guess_language_script("আপনার অ্যাকাউন্ট সাময়িকভাবে বন্ধ") == "bn"
    assert guess_language_script("Your account is temporarily blocked") == "en"
    assert (
        guess_language_script("Apnar account e problem ache bhai") == "en"
    )  # Latin script
    assert guess_language_script("123456 !!!") == "unknown"
