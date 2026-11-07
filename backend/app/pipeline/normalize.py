"""Deterministic normalisation for text, amounts, phone numbers, and language script.

Adheres strictly to Prohori non-negotiable rules:
- No LLM is used for parsing.
- Monetary amounts are strictly handled as Decimal (no float errors, R05).
- Phone numbers are canonicalized to E.164 format (+880...) via phonenumbers library.
- Unicode NFC normalization is applied across all input strings.
"""

from __future__ import annotations

import re
import unicodedata
from decimal import Decimal, InvalidOperation

import phonenumbers

# Mapping Bengali digits (U+09E6 to U+09EF) to ASCII digits (0 to 9)
BANGLA_DIGITS = "০১২৩৪৫৬৭৮৯"
ASCII_DIGITS = "0123456789"
BANGLA_TO_ASCII_MAP = str.maketrans(BANGLA_DIGITS, ASCII_DIGITS)
ASCII_TO_BANGLA_MAP = str.maketrans(ASCII_DIGITS, BANGLA_DIGITS)

# Zero-width spaces and formatting characters to strip
_ZERO_WIDTH_CHARS = re.compile(r"[\u200B-\u200D\uFEFF]")
_MULTI_WHITESPACE = re.compile(r"[ \t\r\f\v]+")

# Regex for currency words and abbreviations
_CURRENCY_MARKERS = re.compile(r"(?i)\b(?:bdt|taka|tk|টাকা|টাকার|৳)\b")


def _clean_decimal(d: Decimal) -> Decimal:
    """Format decimal without scientific notation and strip trailing zeros."""
    if d == d.to_integral():
        return d.quantize(Decimal("1"))
    return Decimal(f"{d:f}".rstrip("0").rstrip("."))


def normalize_text(text: str) -> str:
    """Normalize text into Unicode NFC form, removing zero-width characters."""
    if not text:
        return ""
    text = unicodedata.normalize("NFC", text)
    text = _ZERO_WIDTH_CHARS.sub("", text)
    return text.strip()


def bangla_digits_to_ascii(text: str) -> str:
    """Convert all Bengali digits (০-৯) in text to ASCII digits (0-9)."""
    if not text:
        return ""
    return text.translate(BANGLA_TO_ASCII_MAP)


def ascii_to_bangla_digits(text: str) -> str:
    """Convert all ASCII digits (0-9) in text to Bengali digits (০-৯)."""
    if not text:
        return ""
    return text.translate(ASCII_TO_BANGLA_MAP)


def parse_amount_bdt(text: str) -> Decimal | None:
    """Extract and parse a BDT amount into a Decimal.

    Handles:
    - Bengali and ASCII digits
    - 'taka', 'Tk', 'tk', 'TK', '৳', 'BDT', 'টাকা', 'টাকার'
    - Lakh / lac / লাখ / লক্ষ (1 lakh = 100,000)
    - Crore / কোটি (1 crore = 10,000,000)
    - Thousand / হাজার (1 thousand = 1,000)
    - South Asian comma groupings (e.g. 1,50,000 or 10,000)
    - Decimal amounts (e.g. 1.5 lakh -> 150000, 500.50 -> 500.50)

    Never uses float to prevent precision issues (R05).
    """
    if not text:
        return None

    # Step 1: Normalize NFC & convert Bangla digits to ASCII
    cleaned = bangla_digits_to_ascii(normalize_text(text))

    # Pattern for lakh/crore/thousand with optional preceding/trailing amount
    # Matches e.g. "1.5 lakh", "১.৫ লাখ", "2 লাখ টাকা", "5 lac", "0.25 crore", "10 হাজার"
    multiplier_pattern = re.compile(
        r"(?i)(?:bdt|tk|taka|৳|টাকা|টাকার)?\s*"
        r"(\d+(?:\.\d+)?)\s*"
        r"(lakh|lac|লাখ|লক্ষ|crore|কোটি|thousand|হাজার|k)(?:\s|\b|$)",
        re.UNICODE,
    )

    match = multiplier_pattern.search(cleaned)
    if match:
        num_str, unit = match.groups()
        try:
            val = Decimal(num_str)
            unit_lower = unit.lower()
            if unit_lower in ("lakh", "lac", "লাখ", "লক্ষ"):
                return _clean_decimal(val * Decimal("100000"))
            if unit_lower in ("crore", "কোটি"):
                return _clean_decimal(val * Decimal("10000000"))
            if unit_lower in ("thousand", "হাজার", "k"):
                return _clean_decimal(val * Decimal("1000"))
        except InvalidOperation:
            pass

    # Pattern for standard numbers with currency indicator:
    # e.g., "BDT 50,000", "500 taka", "৳ 1,200", "15000 Tk", "৫০,০০০ টাকা", "৳ 2500.50"
    standard_pattern = re.compile(
        r"(?:(?:bdt|tk|taka|৳|টাকা|টাকার)\s*[:.-]?\s*((?:\d{1,3}(?:,\d{2,3})+|\d+)(?:\.\d+)?)\b|"
        r"\b((?:\d{1,3}(?:,\d{2,3})+|\d+)(?:\.\d+)?)\s*(?:bdt|tk|taka|৳|টাকা|টাকার))",
        re.IGNORECASE | re.UNICODE,
    )

    match = standard_pattern.search(cleaned)
    if match:
        num_str = match.group(1) or match.group(2)
        if num_str:
            num_clean = num_str.replace(",", "")
            try:
                return Decimal(num_clean)
            except InvalidOperation:
                pass

    # Fallback: check if the string itself is a bare number (e.g. "50000")
    bare_pattern = re.compile(
        r"^\s*(\d{1,3}(?:,\d{2,3})*(?:\.\d+)?|\d+(?:\.\d+)?)\s*$"
    )
    match = bare_pattern.match(cleaned)
    if match:
        num_clean = match.group(1).replace(",", "")
        try:
            return Decimal(num_clean)
        except InvalidOperation:
            pass

    return None


def normalize_amount(val: str | int | Decimal) -> Decimal:
    """Normalize input into Decimal BDT, raising ValueError if invalid."""
    if isinstance(val, Decimal):
        return val
    if isinstance(val, int):
        return Decimal(val)
    if isinstance(val, str):
        parsed = parse_amount_bdt(val)
        if parsed is not None:
            return parsed
        # If bare string conversion fails
        try:
            cleaned = bangla_digits_to_ascii(val).replace(",", "").strip()
            return Decimal(cleaned)
        except InvalidOperation as err:
            raise ValueError(f"Cannot parse amount as Decimal BDT: {val}") from err
    raise TypeError(f"Unsupported amount type: {type(val)}")


def normalize_phone_number(phone_str: str) -> str | None:
    """Normalize a Bangladesh phone number into canonical E.164 (+8801XXXXXXXXX).

    Handles:
    - Bengali digits (e.g. ০১৭১২৩৪৫৬৭৮)
    - ASCII national format (e.g. 01712345678)
    - International format (e.g. +8801712345678, 8801712345678)
    - Dashes, spaces, and formatting characters

    Returns canonical E.164 string (+8801...) or None if invalid.
    """
    if not phone_str:
        return None

    cleaned = bangla_digits_to_ascii(phone_str)
    # Remove all characters except +, digits
    cleaned = re.sub(r"[^\d+]", "", cleaned)

    # Normalize leading 880 or +880 or plain 1...
    if cleaned.startswith("880"):
        cleaned = "+" + cleaned
    elif cleaned.startswith("01") and len(cleaned) == 11:
        cleaned = "+88" + cleaned
    elif cleaned.startswith("1") and len(cleaned) == 10:
        cleaned = "+880" + cleaned

    try:
        parsed = phonenumbers.parse(cleaned, "BD")
        if phonenumbers.is_valid_number_for_region(parsed, "BD"):
            return phonenumbers.format_number(
                parsed, phonenumbers.PhoneNumberFormat.E164
            )
        # Even if strict region check is borderline, check if possible mobile
        if phonenumbers.is_possible_number(parsed):
            formatted = phonenumbers.format_number(
                parsed, phonenumbers.PhoneNumberFormat.E164
            )
            # Bangladesh mobile numbers match +8801[3-9]\d{8}
            if re.match(r"^\+8801[3-9]\d{8}$", formatted):
                return formatted
    except phonenumbers.NumberParseException:
        pass

    # Regex fallback for standard BD mobile numbers: 01[3-9]XXXXXXXX
    match = re.search(r"(?:\+?880|880)?(01[3-9]\d{8})", cleaned)
    if match:
        return "+88" + match.group(1)

    return None


def extract_phone_numbers(text: str) -> list[str]:
    """Find and normalize all Bangladesh phone numbers in text.

    Scans both Bengali and ASCII digit representations.
    Returns deduplicated list of canonical E.164 strings (+8801...).
    """
    if not text:
        return []

    ascii_text = bangla_digits_to_ascii(text)
    found_numbers: list[str] = []
    seen: set[str] = set()

    # Match potential BD phone numbers
    pattern = re.compile(
        r"(?:(?:\+?880|880)[\s-]?)?0?1[3-9]\d{2}[\s-]?\d{3}[\s-]?\d{3}\b"
    )

    for match in pattern.finditer(ascii_text):
        raw_match = match.group(0)
        norm = normalize_phone_number(raw_match)
        if norm and norm not in seen:
            seen.add(norm)
            found_numbers.append(norm)

    return found_numbers


def guess_language_script(text: str) -> str:
    """Guess language script using Unicode character counts without calling an LLM.

    Returns:
    - 'bn': predominantly Bengali script (U+0980 to U+09FF)
    - 'en': predominantly Latin script (English or Banglish)
    - 'mixed': mixed or ambiguous script ratio
    - 'unknown': no alphabetic content
    """
    if not text:
        return "unknown"

    bengali_count = 0
    latin_count = 0

    for ch in text:
        cp = ord(ch)
        if 0x0980 <= cp <= 0x09FF:
            bengali_count += 1
        elif (0x0041 <= cp <= 0x005A) or (0x0061 <= cp <= 0x007A):
            latin_count += 1

    total_alpha = bengali_count + latin_count
    if total_alpha == 0:
        return "unknown"

    if bengali_count > 0 and latin_count == 0:
        return "bn"
    if latin_count > 0 and bengali_count == 0:
        return "en"

    # When both are present
    bengali_ratio = bengali_count / total_alpha
    if bengali_ratio >= 0.30:
        # A significant fraction of Bengali letters indicates Bengali text
        return "bn"
    if bengali_ratio <= 0.10:
        return "en"

    return "mixed"
