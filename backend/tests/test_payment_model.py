"""Unit tests for payment risk scoring and explanation (riskmodel.py)."""

from decimal import Decimal

from app.pipeline.riskmodel import PaymentInput, predict_payment_risk


def test_payment_risk_model_high_risk():
    res = predict_payment_risk(
        amount=Decimal("150000"),
        recipient_status="suspicious",
        channel="sms_link",
        urgency=1,
        hour=2,
    )
    assert res.probability >= 0.75
    assert res.candidate_level == "High"
    assert res.simulated is True
    assert len(res.top_factors) >= 1
    # Verify factor descriptions exist in both languages
    factor = res.top_factors[0]
    assert factor.description_en
    assert factor.description_bn


def test_payment_risk_model_low_risk():
    res = predict_payment_risk(
        amount=Decimal("300"),
        recipient_status="frequent",
        channel="app",
        urgency=0,
        hour=14,
    )
    assert res.probability < 0.40
    assert res.candidate_level == "Low"
    assert res.simulated is True


def test_payment_risk_input_from_string():
    payment = PaymentInput.from_values(
        amount="১.৫ লাখ টাকা",
        recipient_status="new",
        channel="app",
        urgency=True,
        hour=23,
    )
    assert payment.amount_band == "very_high"
    assert payment.urgency == 1
    assert payment.hour == 23
