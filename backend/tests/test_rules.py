"""Unit tests for RuleEngine and rules.yaml."""

from app.pipeline.rules.engine import get_rule_engine


def test_rule_engine_loads_rules():
    engine = get_rule_engine()
    assert len(engine._rules) >= 7


def test_hard_rule_otp_pin_bangla():
    engine = get_rule_engine()
    text = "আপনার একাউন্ট সাময়িক ব্লক। আনব্লক করতে OTP 123456 পাঠান।"
    res = engine.evaluate(text, otp_pin_detected=True)
    assert res.has_hard_hit
    assert res.floor == "High"
    assert "HARD_OTP_PIN_PASSWORD" in res.rule_ids


def test_hard_rule_otp_pin_english():
    engine = get_rule_engine()
    text = "Dear customer, read me the 6-digit code you just got to avoid suspension."
    res = engine.evaluate(text)
    assert res.has_hard_hit
    assert res.floor == "High"
    assert "HARD_OTP_PIN_PASSWORD" in res.rule_ids


def test_hard_rule_otp_pin_banglish():
    engine = get_rule_engine()
    text = "Bhai wallet e problem, ekta 6 digit code pathao 01700112233 e quick."
    res = engine.evaluate(text)
    assert res.has_hard_hit
    assert res.floor == "High"
    assert "HARD_OTP_PIN_PASSWORD" in res.rule_ids


def test_hard_rule_confirmed_risky_number():
    engine = get_rule_engine()
    risky_hash = "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
    res = engine.evaluate(
        "সাধারণ একটি মেসেজ কোনো কোড নেই",
        phone_hashes=[risky_hash],
        risky_number_hashes={risky_hash},
    )
    assert res.has_hard_hit
    assert res.floor == "High"
    assert "HARD_CONFIRMED_RISKY_NUMBER" in res.rule_ids


def test_soft_rules_urgency_and_prize():
    engine = get_rule_engine()
    # Urgency + Prize = 2 soft rules -> Floor Medium
    text = (
        "CONGRATULATIONS! You won a prize in our lucky draw. "
        "Claim within 24 hours today."
    )
    res = engine.evaluate(text)
    assert not res.has_hard_hit
    assert len(res.soft_hits) >= 2
    assert res.floor == "Medium"
    assert "SOFT_URGENCY" in res.rule_ids
    assert "SOFT_PRIZE_WORDING" in res.rule_ids


def test_single_soft_rule_has_no_floor():
    engine = get_rule_engine()
    # Single urgency word alone does not set floor
    text = "Please reply quickly when you get time."
    res = engine.evaluate(text)
    assert res.floor is None


def test_refund_story_bangla():
    engine = get_rule_engine()
    text = "ভুল করে আপনার নম্বরে টাকা পাঠিয়ে ফেলেছি, দয়া করে ফেরত পাঠান।"
    res = engine.evaluate(text)
    assert "SOFT_REFUND_STORY" in res.rule_ids


def test_genuine_message_has_no_hits():
    engine = get_rule_engine()
    text = "আপনার মোবাইল রিচার্জ ২০০ টাকা সফল হয়েছে। বর্তমান ব্যালেন্স ৪৫ টাকা।"
    res = engine.evaluate(text)
    assert not res.has_rule_hit
    assert res.floor is None
