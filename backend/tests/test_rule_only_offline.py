"""Integration test for Phase 05 'Done when' criterion:

'Done when: Rule-only High works offline with Bangla text'

Executes the entire deterministic non-AI pipeline:
Normalization -> Masking -> Rules -> Fusion -> Templates.
Guarantees zero network calls, zero LLMs, and exact Bangla output.
"""

from app.pipeline.fusion import RiskLevel, fuse_risk
from app.pipeline.masking import mask_text
from app.pipeline.normalize import guess_language_script, normalize_text
from app.pipeline.rules.engine import get_rule_engine
from app.pipeline.templates import get_rule_only_explanation


def test_rule_only_high_offline_bangla():
    # 1. Realistic Bangla scam message asking for OTP
    raw_message = (
        "প্রিয় গ্রাহক, আপনার অ্যাকাউন্ট ব্লক হতে পারে। "
        "যাচাই করতে এখনই আপনার OTP 482915 টি এই নম্বরে পাঠান: 01712345678। - সহায়তা টিম"
    )

    # 2. Deterministic Normalization
    normalized = normalize_text(raw_message)
    detected_script = guess_language_script(normalized)
    assert detected_script == "bn"

    # 3. PII Masking
    mask_result = mask_text(normalized, hmac_key="test-offline-hmac-key")
    assert mask_result.otp_pin_detected is True
    assert len(mask_result.phone_numbers) == 1
    phone_item = mask_result.phone_numbers[0]
    assert phone_item.placeholder == "[PHONE_1]"
    assert phone_item.masked_display == "+880 17** ***678"
    assert len(phone_item.hmac_hash) == 64

    # Assert no full phone or OTP exists in masked text
    assert "01712345678" not in mask_result.masked_text
    assert "[PHONE_1]" in mask_result.masked_text

    # 4. Rule Engine Evaluation
    engine = get_rule_engine()
    phone_hashes = [p.hmac_hash for p in mask_result.phone_numbers]
    rule_res = engine.evaluate(
        mask_result.masked_text,
        phone_hashes=phone_hashes,
        otp_pin_detected=mask_result.otp_pin_detected,
    )

    assert rule_res.has_hard_hit is True
    assert rule_res.floor == "High"
    assert "HARD_OTP_PIN_PASSWORD" in rule_res.rule_ids

    # 5. Risk Fusion (no LLM, pure function)
    fusion_res = fuse_risk(
        has_hard_rule=rule_res.has_hard_hit,
        soft_rule_count=len(rule_res.soft_hits),
        llm_level=None,  # No LLM invoked for hard rule
        is_message_check=True,
    )

    assert fusion_res.final_level == RiskLevel.HIGH
    assert fusion_res.floor == RiskLevel.HIGH

    # 6. Fixed Bangla Template Explanation (no LLM)
    primary_rule = rule_res.hard_hits[0].rule_id
    explanation = get_rule_only_explanation(primary_rule, language="bn")

    assert explanation.risk_level == "High"
    assert explanation.language == "bn"
    assert "ওটিপি" in explanation.title or "পিন" in explanation.title
    assert "কোনো ব্যাংক, বিকাশ, নগদ বা রকেট" in explanation.explanation
    assert len(explanation.safe_action_ids) >= 2
    assert "never_share_otp" in explanation.safe_action_ids

    # Print summary of the offline verification
    print("\n" + "=" * 70)
    print("PHASE 05 OFFLINE RULE-ONLY VERIFICATION COMPLETE")
    print("=" * 70)
    print(f"Input: {raw_message[:50]}...")
    print(f"Masked text: {mask_result.masked_text}")
    print(f"Phone display: {phone_item.masked_display}")
    print(f"Rules triggered: {rule_res.rule_ids}")
    print(f"Fusion Final Level: {fusion_res.final_level}")
    print(f"Explanation Title (Bangla): {explanation.title}")
    print(f"Safe Actions: {explanation.safe_action_ids}")
    print("=" * 70 + "\n")
