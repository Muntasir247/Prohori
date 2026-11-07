"""Deterministic templates for rule-only results in Bangla and English.

Doc 02 Section 10.2:
When a hard rule triggers, the LLM is bypassed completely:
(rules_only: template, no LLM).
These fixed templates provide verified, clear explanations and trusted safe actions
without latency, cost, or hallucination risk.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

LanguageCode = Literal["bn", "en"]


@dataclass(frozen=True)
class RuleOnlyExplanation:
    """Pre-authored, verified explanation for deterministic rule-only checks."""

    rule_id: str
    language: LanguageCode
    risk_level: str  # Always 'High' for hard rules
    title: str
    explanation: str
    caution: str
    safe_action_ids: list[str] = field(default_factory=list)


# --------------------------------------------------------------------------- #
# Rule explanation templates repository
# --------------------------------------------------------------------------- #

TEMPLATES: dict[str, dict[LanguageCode, RuleOnlyExplanation]] = {
    "HARD_OTP_PIN_PASSWORD": {
        "bn": RuleOnlyExplanation(
            rule_id="HARD_OTP_PIN_PASSWORD",
            language="bn",
            risk_level="High",
            title="গোপন ওটিপি (OTP), পিন (PIN) বা পাসওয়ার্ড কখনোই কাউকে দেবেন না",
            explanation=(
                "বার্তাটিতে আপনার গোপন ওটিপি, পিন নম্বর বা পাসওয়ার্ড চাওয়া হয়েছে। "
                "কোনো ব্যাংক, বিকাশ, নগদ বা রকেট কর্তৃপক্ষ কখনো গ্রাহকের কাছে পিন বা "
                "ওটিপি কোড জানতে চায় না। এটি নিশ্চিতভাবে একটি আর্থিক প্রতারণার চেষ্টা।"
            ),
            caution=(
                "কাউকে কোনো ওটিপি বা পিন নম্বর দেবেন না। যদি ইতিমধ্যে দিয়ে থাকেন, "
                "তবে অনতিবিলম্বে সংশ্লিষ্ট ওয়ালেট বা ব্যাংকের অফিশিয়াল হেল্পলাইনে যোগাযোগ করে "
                "আপনার অ্যাকাউন্ট সাময়িক স্থগিত করুন।"
            ),
            safe_action_ids=[
                "never_share_otp",
                "call_official_helpline",
                "block_number",
            ],
        ),
        "en": RuleOnlyExplanation(
            rule_id="HARD_OTP_PIN_PASSWORD",
            language="en",
            risk_level="High",
            title="Never share your secret OTP, PIN, or password with anyone",
            explanation=(
                "This message asks for your secret OTP, PIN, or password. "
                "No bank, bKash, Nagad, or wallet provider will ever ask for your "
                "PIN or OTP via text or phone call. This is a confirmed fraud attempt."
            ),
            caution=(
                "Do not share any code or PIN. If you already disclosed it, "
                "call your official bank or mobile wallet helpline immediately "
                "to protect your funds."
            ),
            safe_action_ids=[
                "never_share_otp",
                "call_official_helpline",
                "block_number",
            ],
        ),
    },
    "HARD_CONFIRMED_RISKY_NUMBER": {
        "bn": RuleOnlyExplanation(
            rule_id="HARD_CONFIRMED_RISKY_NUMBER",
            language="bn",
            risk_level="High",
            title="এই নম্বরটি প্রতারণার কারণে পূর্বে তালিকাভুক্ত করা হয়েছে",
            explanation=(
                "বার্তা বা অনুরোধে উল্লেখিত ফোন নম্বরটি প্রহরীর মানব-পর্যালোচকদের দ্বারা "
                "যাচাইকৃত ঝুঁকিপূর্ণ প্রতারক নম্বরের ডাটাবেজে রয়েছে। এই নম্বরের সাথে লেনদেন "
                "করা অত্যন্ত ঝুঁকিপূর্ণ।"
            ),
            caution=(
                "এই নম্বরে কোনো টাকা পাঠাবেন না এবং কোনো তথ্যের উত্তর দেবেন না। "
                "প্রয়োজনে নম্বরটি আপনার ফোন ও ওয়ালেটে ব্লক করুন।"
            ),
            safe_action_ids=[
                "block_number",
                "do_not_send_money",
                "report_suspicious_activity",
            ],
        ),
        "en": RuleOnlyExplanation(
            rule_id="HARD_CONFIRMED_RISKY_NUMBER",
            language="en",
            risk_level="High",
            title="This number is confirmed as fraudulent by previous reports",
            explanation=(
                "The phone number mentioned in this check matches a verified entry in "
                "Prohori's human-reviewed fraudulent numbers list. Engaging in any "
                "transaction with this number carries extreme risk of loss."
            ),
            caution=(
                "Do not send money or reply to this number. "
                "Block the number in your phone and mobile wallet immediately."
            ),
            safe_action_ids=[
                "block_number",
                "do_not_send_money",
                "report_suspicious_activity",
            ],
        ),
    },
    "GENERIC_HARD_RULE": {
        "bn": RuleOnlyExplanation(
            rule_id="GENERIC_HARD_RULE",
            language="bn",
            risk_level="High",
            title="উচ্চ ঝুঁকিপূর্ণ প্রতারণার স্পষ্ট আলামত চিহ্নিত হয়েছে",
            explanation=(
                "বার্তাটিতে প্রমাণিত প্রতারণামূলক আলামত সনাক্ত হয়েছে। কোনো অবস্থাতেই "
                "টাকা পাঠাবেন না বা ব্যক্তিগত ও আর্থিক তথ্য প্রকাশ করবেন না।"
            ),
            caution="সংশ্লিষ্ট প্রতিষ্ঠানের অফিশিয়াল অ্যাপ বা হেল্পলাইনে যাচাই করুন।",
            safe_action_ids=[
                "pause_and_verify",
                "call_official_helpline",
                "block_number",
            ],
        ),
        "en": RuleOnlyExplanation(
            rule_id="GENERIC_HARD_RULE",
            language="en",
            risk_level="High",
            title="Definite indicators of high-risk fraud identified",
            explanation=(
                "This message contains clear indicators of fraudulent activity. "
                "Under no circumstances should you transfer funds or share "
                "financial credentials."
            ),
            caution=(
                "Verify directly through your provider's official verified "
                "app or helpline."
            ),
            safe_action_ids=[
                "pause_and_verify",
                "call_official_helpline",
                "block_number",
            ],
        ),
    },
}


def get_rule_only_explanation(
    rule_id: str,
    language: str = "bn",
) -> RuleOnlyExplanation:
    """Retrieve fixed rule explanation in requested language (defaults to 'bn')."""
    lang_key: LanguageCode = "en" if language.lower().startswith("en") else "bn"

    rule_dict = TEMPLATES.get(rule_id)
    if rule_dict and lang_key in rule_dict:
        return rule_dict[lang_key]

    # Fallback to generic hard rule
    return TEMPLATES["GENERIC_HARD_RULE"][lang_key]
