"""Presidio-based PII masking with custom recognizers for Bangladesh context.

Follows Prohori non-negotiable rules:
- Never store or log raw message text, full phone numbers, OTPs or PINs.
- OTP and PIN values are removed completely; only their detection is recorded.
- Phone numbers are stored only as HMAC-SHA256 hashes using NUMBER_HMAC_KEY,
  with a safe display form such as '+880 17** ***678'.
- Custom Presidio recognizers for BD mobile numbers (both digit sets), account numbers,
  NID-like numbers, emails, and URL query strings/links.
- Context rules for Bangla names (R07) with honest miss reporting.
"""

from __future__ import annotations

import hashlib
import hmac
import os
import re
from dataclasses import dataclass, field

import tldextract

# Ensure tldextract runs completely offline using its bundled snapshot
try:
    tldextract.extract = tldextract.TLDExtract(suffix_list_urls=())
except Exception:
    pass

from presidio_analyzer import (
    AnalyzerEngine,
    Pattern,
    PatternRecognizer,
    RecognizerResult,
)
from presidio_analyzer.nlp_engine import NlpEngineProvider

from app.pipeline.normalize import (
    bangla_digits_to_ascii,
    normalize_phone_number,
    normalize_text,
)

# --------------------------------------------------------------------------- #
# Data structures
# --------------------------------------------------------------------------- #


@dataclass(frozen=True)
class MaskedPhone:
    """A detected Bangladesh phone number, represented safely."""

    placeholder: str  # e.g. "[PHONE_1]"
    hmac_hash: str  # HMAC-SHA256 hex digest using NUMBER_HMAC_KEY
    masked_display: str  # Safe display form, e.g. "+880 17** ***678"


@dataclass
class MaskingResult:
    """The result of masking PII from message text."""

    masked_text: str
    phone_numbers: list[MaskedPhone] = field(default_factory=list)
    otp_pin_detected: bool = False
    entities_detected: dict[str, int] = field(default_factory=dict)
    bangla_names_detected: list[str] = field(default_factory=list)
    potential_unmasked_names: list[str] = field(default_factory=list)


# --------------------------------------------------------------------------- #
# Display formatting & HMAC helpers
# --------------------------------------------------------------------------- #


def compute_phone_hmac(key: str, canonical_phone: str) -> str:
    """Compute HMAC-SHA256 hex digest of a canonical phone number.

    Never uses plain SHA-256 (avoids rainbow table attacks on 11-digit numbers, R19).
    """
    return hmac.new(
        key.encode("utf-8"),
        canonical_phone.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def format_masked_phone_display(canonical_phone: str) -> str:
    """Format an E.164 BD phone number as safe display: '+880 17** ***678'.

    Input: '+8801712345678' -> Output: '+880 17** ***678'
    """
    if len(canonical_phone) == 14 and canonical_phone.startswith("+880"):
        # +880 1[3-9]** ***XXX
        return (
            f"{canonical_phone[:4]} {canonical_phone[4:6]}** ***{canonical_phone[-3:]}"
        )
    if len(canonical_phone) == 11 and canonical_phone.startswith("01"):
        return f"+880 {canonical_phone[1:3]}** ***{canonical_phone[-3:]}"
    # Fallback masking
    if len(canonical_phone) > 6:
        return f"{canonical_phone[:4]}***{canonical_phone[-3:]}"
    return "••••••••••"


# --------------------------------------------------------------------------- #
# OTP & PIN Pre-pass Removal
# --------------------------------------------------------------------------- #

# Keywords near which a 3-8 digit number indicates code/PIN/OTP/CVV
_OTP_PIN_KEYWORDS_BN = (
    r"(?:ওটিপি|পিন|পিন\s*নম্বর|পাসওয়ার্ড|পাসওয়ার্ড|ভেরিফিকেশন\s*কোড|"
    r"সিক্রেট\s*কোড|কোড|কনফার্মেশন\s*কোড|সিভিভি)"
)
_OTP_PIN_KEYWORDS_EN = (
    r"(?:otp|pin|password|passcode|code|secret\s*code|verification\s*code|"
    r"confirmation\s*code|security\s*code|one-time\s*password|one-time\s*code|cvv)"
)
_OTP_PIN_KEYWORDS_BL = (
    r"(?:digit\s*code|digit\s*er\s*code|sekret\s*code|verifikeson\s*code|"
    r"pin\s*no|login\s*code|passcode)"
)

_ALL_CODE_KEYWORDS = (
    f"(?:{_OTP_PIN_KEYWORDS_BN}|{_OTP_PIN_KEYWORDS_EN}|{_OTP_PIN_KEYWORDS_BL})"
)

# Proximity patterns: keyword within 0-35 characters of 3-8 digit code
_CODE_FOLLOWS_PATTERN = re.compile(
    rf"(?i)\b({_ALL_CODE_KEYWORDS})\b([^\d\n]{{0,35}})\b([0-9০-৯]{{3,8}})\b",
    re.UNICODE,
)
_CODE_PRECEDES_PATTERN = re.compile(
    rf"(?i)\b([0-9০-৯]{{3,8}})\b([^\d\n]{{0,35}})\b({_ALL_CODE_KEYWORDS})\b",
    re.UNICODE,
)


def remove_otps_and_pins(text: str) -> tuple[str, bool]:
    """Detect OTP, PIN, or security code values and remove them entirely.

    Returns (sanitized_text, otp_pin_detected).
    No code digits remain in the output text; only the fact of detection is kept.
    """
    detected = False
    sanitized = text

    # Remove code when keyword precedes it
    def _strip_follows(m: re.Match[str]) -> str:
        nonlocal detected
        detected = True
        return f"{m.group(1)}{m.group(2)}"

    # Remove code when keyword follows it
    def _strip_precedes(m: re.Match[str]) -> str:
        nonlocal detected
        detected = True
        return f"{m.group(2)}{m.group(3)}"

    # Apply both passes
    if _CODE_FOLLOWS_PATTERN.search(sanitized):
        sanitized = _CODE_FOLLOWS_PATTERN.sub(_strip_follows, sanitized)
    if _CODE_PRECEDES_PATTERN.search(sanitized):
        sanitized = _CODE_PRECEDES_PATTERN.sub(_strip_precedes, sanitized)

    return sanitized, detected


# --------------------------------------------------------------------------- #
# Custom Presidio Recognizers
# --------------------------------------------------------------------------- #


def _build_bd_phone_recognizer() -> PatternRecognizer:
    """Recognize Bangladesh mobile numbers in ASCII and Bengali digits."""
    patterns = [
        # ASCII: 013-019 followed by 8 digits, optional +880 or 880 prefix
        Pattern(
            name="bd_phone_ascii",
            regex=r"(?:(?:\+?880|880)[\s-]?)?0?1[3-9]\d{2}[\s-]?\d{3}[\s-]?\d{3}\b",
            score=0.95,
        ),
        # Bengali: ০১[৩-৯] followed by 8 Bengali digits, optional +৮৮০ prefix
        Pattern(
            name="bd_phone_bangla",
            regex=r"(?:(?:\+?৮৮০|৮৮০)[\s-]?)?০?১[৩-৯][০-৯]{2}[\s-]?[০-৯]{3}[\s-]?[০-৯]{3}\b",
            score=0.95,
        ),
    ]
    return PatternRecognizer(
        supported_entity="PHONE_NUMBER",
        patterns=patterns,
        name="BDPhoneRecognizer",
        supported_language="en",
    )


def _build_bd_nid_recognizer() -> PatternRecognizer:
    """Recognize Bangladesh National ID numbers (10-digit smart, 13-digit, 17-digit)."""
    context_words = [
        "nid",
        "national id",
        "smart card",
        "এনআইডি",
        "জাতীয় পরিচয়পত্র",
        "পরিচয়পত্র",
        "nid no",
        "smart nid",
        "ভোটার আইডি",
        "voter id",
    ]
    patterns = [
        # 10-digit Smart NID
        Pattern(name="nid_10_ascii", regex=r"\b\d{10}\b", score=0.6),
        Pattern(name="nid_10_bn", regex=r"\b[০-৯]{10}\b", score=0.6),
        # 13-digit legacy NID
        Pattern(name="nid_13_ascii", regex=r"\b\d{13}\b", score=0.7),
        Pattern(name="nid_13_bn", regex=r"\b[০-৯]{13}\b", score=0.7),
        # 17-digit NID
        Pattern(name="nid_17_ascii", regex=r"\b\d{17}\b", score=0.8),
        Pattern(name="nid_17_bn", regex=r"\b[০-৯]{17}\b", score=0.8),
    ]
    return PatternRecognizer(
        supported_entity="BD_NID",
        patterns=patterns,
        context=context_words,
        name="BDNIDRecognizer",
        supported_language="en",
    )


def _build_bd_account_recognizer() -> PatternRecognizer:
    """Recognize bank and mobile money account numbers."""
    context_words = [
        "account",
        "a/c",
        "acct",
        "acc",
        "acc no",
        "হিসাব",
        "হিসাব নম্বর",
        "অ্যাকাউন্ট",
        "ওয়ালেট",
        "ওয়ালেট",
        "wallet",
        "wallet no",
    ]
    patterns = [
        # Account numbers typically 8 to 16 digits
        Pattern(name="account_ascii", regex=r"\b\d{8,16}\b", score=0.55),
        Pattern(name="account_bn", regex=r"\b[০-৯]{8,16}\b", score=0.55),
        # Hyphenated account numbers (e.g. 104-100-29384)
        Pattern(
            name="account_hyphenated",
            regex=r"\b\d{3,6}-\d{3,6}-\d{4,8}\b",
            score=0.7,
        ),
        Pattern(
            name="account_bn_hyphenated",
            regex=r"\b[০-৯]{3,6}-[০-৯]{3,6}-[০-৯]{4,8}\b",
            score=0.7,
        ),
    ]
    return PatternRecognizer(
        supported_entity="ACCOUNT_NUMBER",
        patterns=patterns,
        context=context_words,
        name="BDAccountRecognizer",
        supported_language="en",
    )


def _build_url_query_recognizer() -> PatternRecognizer:
    """Recognize URLs and query strings containing potentially sensitive data."""
    patterns = [
        Pattern(
            name="full_url",
            regex=r"https?://[^\s<>\"']+",
            score=0.9,
        ),
        Pattern(
            name="domain_link",
            regex=r"\b(?:www\.)?[a-zA-Z0-9-]+\.(?:com|org|net|xyz|top|link|site|info|online|example)(?:/[^\s<>\"']*)?",
            score=0.75,
        ),
    ]
    return PatternRecognizer(
        supported_entity="URL_LINK",
        patterns=patterns,
        name="URLQueryRecognizer",
        supported_language="en",
    )


def _build_card_recognizer() -> PatternRecognizer:
    """Recognize 16-digit debit/credit card numbers in ASCII and Bengali digits."""
    patterns = [
        Pattern(
            name="card_ascii",
            regex=r"\b(?:\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4})\b",
            score=0.85,
        ),
        Pattern(
            name="card_bangla",
            regex=r"\b(?:[০-৯]{4}[\s-]?[০-৯]{4}[\s-]?[০-৯]{4}[\s-]?[০-৯]{4})\b",
            score=0.85,
        ),
    ]
    return PatternRecognizer(
        supported_entity="CREDIT_CARD",
        patterns=patterns,
        name="BDCardRecognizer",
        supported_language="en",
    )


def _build_passport_recognizer() -> PatternRecognizer:
    """Recognize passport numbers (e.g. BD-A0928192)."""
    patterns = [
        Pattern(
            name="passport_bd",
            regex=r"\b(?:BD-[A-Z0-9]{8,10}|[A-Z]{1,2}[0-9]{7,8})\b",
            score=0.8,
        ),
    ]
    return PatternRecognizer(
        supported_entity="PASSPORT",
        patterns=patterns,
        context=["passport", "পাসপোর্ট"],
        name="BDPassportRecognizer",
        supported_language="en",
    )


def _build_bangla_name_recognizer() -> PatternRecognizer:
    """Context-based recognizer for Bangla and English names (Risk R07).

    Presidio lacks a native Bangla NER model. We bridge this with context patterns
    anchored on common honorifics, prefixes ('নাম:', 'গ্রহীতা:', 'Mr.', 'জনাব', etc.).
    """
    patterns = [
        # "নাম: রহিম উদ্দিন" or "Name: John Doe" or "Cardholder Name: Tanzeem"
        Pattern(
            name="name_label_context",
            regex=(
                r"(?i)(?:নাম|গ্রহীতা|প্রাপক|name|cardholder\s*name|recipient)"
                r"\s*[:=-]\s*([A-Za-z\u0980-\u09FF]+(?:\s+[A-Za-z\u0980-\u09FF]+){1,3})"
            ),
            score=0.85,
        ),
        # Honorific prefixes: "জনাব রহিম", "শ্রী সুজন", "বেগম খালেদা", "Md. Rafiq"
        Pattern(
            name="honorific_context",
            regex=(
                r"(?i)\b(?:জনাব|বেগম|শ্রী|মিঃ|মি.|মিসেস|মিস|dr\.|mr\.|mrs\.|ms\.|md\.|mohammad|most\.)"
                r"\s+([A-Za-z\u0980-\u09FF]+(?:\s+[A-Za-z\u0980-\u09FF]+){0,2})\b"
            ),
            score=0.8,
        ),
    ]
    return PatternRecognizer(
        supported_entity="PERSON",
        patterns=patterns,
        name="BanglaNameRecognizer",
        supported_language="en",
    )


# --------------------------------------------------------------------------- #
# Engine Singleton / Factory
# --------------------------------------------------------------------------- #

_ANALYZER_INSTANCE: AnalyzerEngine | None = None


def get_analyzer_engine() -> AnalyzerEngine:
    """Initialize and configure the Presidio AnalyzerEngine once."""
    global _ANALYZER_INSTANCE
    if _ANALYZER_INSTANCE is None:
        # Configure Spacy with en_core_web_sm (already installed offline)
        nlp_config = {
            "nlp_engine_name": "spacy",
            "models": [{"lang_code": "en", "model_name": "en_core_web_sm"}],
        }
        provider = NlpEngineProvider(nlp_configuration=nlp_config)
        nlp_engine = provider.create_engine()
        analyzer = AnalyzerEngine(nlp_engine=nlp_engine, supported_languages=["en"])

        # Register custom recognizers
        analyzer.registry.add_recognizer(_build_bd_phone_recognizer())
        analyzer.registry.add_recognizer(_build_bd_nid_recognizer())
        analyzer.registry.add_recognizer(_build_bd_account_recognizer())
        analyzer.registry.add_recognizer(_build_card_recognizer())
        analyzer.registry.add_recognizer(_build_passport_recognizer())
        analyzer.registry.add_recognizer(_build_url_query_recognizer())
        analyzer.registry.add_recognizer(_build_bangla_name_recognizer())

        _ANALYZER_INSTANCE = analyzer
    return _ANALYZER_INSTANCE


# --------------------------------------------------------------------------- #
# Main Masking Function
# --------------------------------------------------------------------------- #


def mask_text(
    text: str,
    *,
    hmac_key: str | None = None,
) -> MaskingResult:
    """Mask PII from message text and return structured result.

    Steps:
    1. Unicode NFC normalization.
    2. Detection and complete removal of OTP/PIN codes near keywords.
    3. Presidio analysis with custom BD recognizers.
    4. Stable replacement with indexed placeholders ([PHONE_1], [ACCOUNT_1], etc.).
    5. Safe HMAC-SHA256 and display formatting for phone numbers.
    6. Identification of detected vs. missed Bangla names for honest R07 reporting.
    """
    if not text:
        return MaskingResult(masked_text="")

    # Resolve HMAC key
    if not hmac_key:
        hmac_key = os.environ.get("NUMBER_HMAC_KEY", "prohori-default-hmac-key")

    normalized = normalize_text(text)

    # Step 1: Detect and remove OTP/PIN values entirely
    cleaned_text, otp_pin_detected = remove_otps_and_pins(normalized)

    # Step 2: Presidio analyzer run
    analyzer = get_analyzer_engine()
    results: list[RecognizerResult] = analyzer.analyze(
        text=cleaned_text,
        language="en",
        entities=[
            "PHONE_NUMBER",
            "ACCOUNT_NUMBER",
            "CREDIT_CARD",
            "PASSPORT",
            "BD_NID",
            "EMAIL_ADDRESS",
            "URL_LINK",
            "PERSON",
        ],
        score_threshold=0.45,
    )

    # Filter results to prevent English NER from hallucinating on Bengali script (R07)
    valid_results: list[RecognizerResult] = []
    for r in results:
        span = cleaned_text[r.start : r.end]
        if r.entity_type == "PERSON":
            has_bengali = any(0x0980 <= ord(c) <= 0x09FF for c in span)
            rec_name = getattr(r, "recognition_metadata", {}).get("recognizer_name", "")
            if has_bengali and rec_name != "BanglaNameRecognizer":
                continue
        valid_results.append(r)

    _ENTITY_PRIORITY = {
        "PHONE_NUMBER": 10,
        "BD_NID": 9,
        "PASSPORT": 9,
        "ACCOUNT_NUMBER": 8,
        "CREDIT_CARD": 8,
        "EMAIL_ADDRESS": 7,
        "EMAIL": 7,
        "URL_LINK": 6,
        "URL": 6,
        "PERSON": 5,
    }

    # Step 3: Sort recognizer results by start index, length, priority, score
    sorted_results = sorted(
        valid_results,
        key=lambda r: (
            r.start,
            -(r.end - r.start),
            -_ENTITY_PRIORITY.get(r.entity_type, 0),
            -r.score,
        ),
    )

    non_overlapping: list[RecognizerResult] = []
    last_end = 0
    for r in sorted_results:
        if r.start >= last_end:
            non_overlapping.append(r)
            last_end = r.end

    # Step 4: Build stable placeholder mappings and replace entities
    # Map raw value -> assigned placeholder
    phone_map: dict[str, MaskedPhone] = {}
    entity_value_map: dict[tuple[str, str], str] = {}
    type_counters: dict[str, int] = {
        "PHONE": 0,
        "ACCOUNT": 0,
        "NID": 0,
        "EMAIL": 0,
        "LINK": 0,
        "NAME": 0,
    }
    entity_counts: dict[str, int] = {}
    bangla_names_detected: list[str] = []

    # Map Presidio entity types to our standardized category tags
    def _entity_category(entity_type: str) -> str:
        if entity_type == "PHONE_NUMBER":
            return "PHONE"
        if entity_type in ("ACCOUNT_NUMBER", "CREDIT_CARD"):
            return "ACCOUNT"
        if entity_type in ("BD_NID", "PASSPORT"):
            return "NID"
        if entity_type in ("EMAIL_ADDRESS", "EMAIL"):
            return "EMAIL"
        if entity_type in ("URL_LINK", "URL"):
            return "LINK"
        if entity_type == "PERSON":
            return "NAME"
        return "ENTITY"

    # Process replacements from right to left to maintain valid start/end offsets
    # But assign stable numbers in order of first appearance (left to right)
    planned_replacements: list[tuple[int, int, str]] = []

    for r in non_overlapping:
        raw_val = cleaned_text[r.start : r.end].strip()
        cat = _entity_category(r.entity_type)
        entity_counts[cat] = entity_counts.get(cat, 0) + 1

        if cat == "PHONE":
            # Canonicalize phone number
            canonical = normalize_phone_number(raw_val)
            if not canonical:
                # Fallback to ASCII digits
                ascii_digits = bangla_digits_to_ascii(raw_val)
                canonical = normalize_phone_number(ascii_digits) or ascii_digits

            if canonical in phone_map:
                placeholder = phone_map[canonical].placeholder
            else:
                type_counters["PHONE"] += 1
                placeholder = f"[PHONE_{type_counters['PHONE']}]"
                h_hash = compute_phone_hmac(hmac_key, canonical)
                display = format_masked_phone_display(canonical)
                phone_map[canonical] = MaskedPhone(
                    placeholder=placeholder,
                    hmac_hash=h_hash,
                    masked_display=display,
                )
            planned_replacements.append((r.start, r.end, placeholder))

        elif cat == "NAME":
            if raw_val not in entity_value_map:
                type_counters["NAME"] += 1
                entity_value_map[(cat, raw_val)] = f"[NAME_{type_counters['NAME']}]"
                bangla_names_detected.append(raw_val)
            placeholder = entity_value_map[(cat, raw_val)]
            planned_replacements.append((r.start, r.end, placeholder))

        elif cat in ("ACCOUNT", "NID", "EMAIL", "LINK"):
            key = (cat, raw_val)
            if key not in entity_value_map:
                type_counters[cat] += 1
                entity_value_map[key] = f"[{cat}_{type_counters[cat]}]"
            placeholder = entity_value_map[key]
            planned_replacements.append((r.start, r.end, placeholder))
        else:
            planned_replacements.append((r.start, r.end, "[REDACTED]"))

    # Apply text replacements from right to left
    chars = list(cleaned_text)
    for start, end, placeholder in sorted(
        planned_replacements, key=lambda x: x[0], reverse=True
    ):
        chars[start:end] = list(placeholder)

    masked_text = "".join(chars)

    # Step 5: Second pass for any surviving unmasked phone numbers in both scripts
    surviving_phone_pattern = re.compile(
        r"(?:(?:\+?880|880)[\s-]?)?0?1[3-9][0-9০-৯\d]{2}[\s-]?[0-9০-৯\d]{3}[\s-]?[0-9০-৯\d]{3}\b"
    )
    for m in surviving_phone_pattern.finditer(masked_text):
        raw_num = m.group(0)
        canonical = normalize_phone_number(raw_num) or bangla_digits_to_ascii(raw_num)
        if canonical not in phone_map:
            type_counters["PHONE"] += 1
            placeholder = f"[PHONE_{type_counters['PHONE']}]"
            h_hash = compute_phone_hmac(hmac_key, canonical)
            display = format_masked_phone_display(canonical)
            phone_map[canonical] = MaskedPhone(
                placeholder=placeholder,
                hmac_hash=h_hash,
                masked_display=display,
            )
        else:
            placeholder = phone_map[canonical].placeholder
        masked_text = masked_text.replace(raw_num, placeholder, 1)

    # Step 6: Risk R07 Honest Miss Heuristic Check
    # Identify candidate Bangla names that were not preceded by honorific context
    # (e.g. 2-3 capitalized Latin words or standalone Bengali words)
    potential_misses: list[str] = []
    # Check for common name patterns that might have been missed
    candidate_name_pattern = re.compile(r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\b")
    for m in candidate_name_pattern.finditer(masked_text):
        candidate = m.group(1)
        if candidate not in (
            "Dear Customer",
            "Taka",
            "BDT",
            "Lucky Draw",
            "Assalamu Alaikum",
            "Customer Care",
        ):
            potential_misses.append(candidate)

    return MaskingResult(
        masked_text=masked_text,
        phone_numbers=list(phone_map.values()),
        otp_pin_detected=otp_pin_detected,
        entities_detected=entity_counts,
        bangla_names_detected=bangla_names_detected,
        potential_unmasked_names=potential_misses,
    )
