"""Payment risk scoring model loader, predictor, and factor explainer.

Adheres to Doc 02 Section 10.1 & F06:
- Loads the trained logistic regression artifact.
- Predicts fraud probability from payment features.
- Maps probability to risk level candidate per Section 10.3 Step 4:
  - under 0.40: Low
  - 0.40 to 0.74: Medium
  - 0.75 and over: High
- Extracts top risk-increasing factors from coefficients.
- Always tags outputs with simulated=True (metrics reflect simulated data only).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal
from pathlib import Path
from typing import Any

import joblib
import numpy as np
from training.train_payment_model import (
    CHANNELS,
    RECIPIENT_STATUSES,
    assign_amount_band,
)

from app.pipeline.normalize import parse_amount_bdt

# --------------------------------------------------------------------------- #
# Data structures
# --------------------------------------------------------------------------- #


@dataclass
class PaymentInput:
    """Input parameters for payment risk evaluation."""

    amount_band: str  # 'very_low' | 'low' | 'medium' | 'high' | 'very_high'
    recipient_status: str  # 'known' | 'frequent' | 'new' | 'suspicious'
    channel: str  # 'app' | 'ussd' | 'agent' | 'sms_link' | 'web'
    urgency: int  # 0 | 1
    hour: int  # 0..23

    @classmethod
    def from_values(
        cls,
        *,
        amount: Decimal | float | int | str,
        recipient_status: str = "new",
        channel: str = "app",
        urgency: bool | int = 0,
        hour: int = 12,
    ) -> PaymentInput:
        """Construct PaymentInput from raw inputs, normalizing amount to band."""
        if isinstance(amount, str):
            parsed = parse_amount_bdt(amount)
            amt_num = float(parsed) if parsed is not None else 1000.0
        elif isinstance(amount, Decimal):
            amt_num = float(amount)
        else:
            amt_num = float(amount)

        band = assign_amount_band(amt_num)
        rec_status = (
            recipient_status.lower()
            if recipient_status in RECIPIENT_STATUSES
            else "new"
        )
        ch = channel.lower() if channel in CHANNELS else "app"
        urg = 1 if urgency in (True, 1, "1", "true", "True") else 0
        hr = int(hour) % 24

        return cls(
            amount_band=band,
            recipient_status=rec_status,
            channel=ch,
            urgency=urg,
            hour=hr,
        )


@dataclass(frozen=True)
class RiskFactor:
    """An individual factor contributing to the payment risk score."""

    feature: str
    weight: float
    description_en: str
    description_bn: str


@dataclass
class PaymentRiskResult:
    """The result of scoring a payment request."""

    probability: float
    candidate_level: str  # 'Low' | 'Medium' | 'High'
    top_factors: list[RiskFactor] = field(default_factory=list)
    model_version: str = "1.0.0"
    simulated: bool = True


# --------------------------------------------------------------------------- #
# Explanations dictionary for positive weights
# --------------------------------------------------------------------------- #

_FACTOR_DESCRIPTIONS = {
    "amount_band_very_high": (
        "Very high transaction amount (> 50,000 BDT)",
        "অস্বাভাবিক উচ্চ অঙ্কের লেনদেন (৫০,০০০ টাকার বেশি)",
    ),
    "amount_band_high": (
        "High transaction amount (10,000 - 50,000 BDT)",
        "উচ্চ অঙ্কের লেনদেন (১০,০০০ থেকে ৫০,০০০ টাকা)",
    ),
    "amount_band_medium": (
        "Moderate transaction amount",
        "মাঝারি অঙ্কের লেনদেন",
    ),
    "recipient_status_suspicious": (
        "Recipient marked as suspicious or frequently reported",
        "প্রাপকের অ্যাকাউন্ট সন্দেহজনক বা পূর্বে রিপোর্টকৃত",
    ),
    "recipient_status_new": (
        "Payment to an unfamiliar or first-time recipient",
        "নতুন বা অপরিচিত নম্বরে টাকা পাঠানোর অনুরোধ",
    ),
    "channel_sms_link": (
        "Payment requested via SMS or chat link",
        "এসএমএস বা মেসেজের লিংকের মাধ্যমে পেমেন্ট অনুরোধ",
    ),
    "channel_web": (
        "Payment requested via unofficial web portal",
        "অনলাইন ওয়েব পেজের মাধ্যমে লেনদেন",
    ),
    "channel_agent": (
        "Payment via cash-in/agent channel",
        "এজেন্ট পয়েন্টের মাধ্যমে লেনদেন",
    ),
    "urgency": (
        "Urgent time pressure imposed on the payment",
        "অতি-জরুরি সময়সীমা বা মানসিক চাপ",
    ),
    "hour": (
        "Transaction initiated at late night or unusual hours",
        "অস্বাভাবিক সময়ে বা গভীর রাতে লেনদেনের অনুরোধ",
    ),
}


# --------------------------------------------------------------------------- #
# Model Loader and Predictor
# --------------------------------------------------------------------------- #


class PaymentRiskModel:
    """Wraps the trained Logistic Regression pipeline and computes top risk factors."""

    def __init__(self, model_path: Path | str | None = None) -> None:
        if model_path is None:
            model_path = (
                Path(__file__).resolve().parent / "models" / "payment_risk_model.joblib"
            )
        self.model_path = Path(model_path)
        self._artifact = self._load_artifact()
        self.pipeline = self._artifact["pipeline"]
        self.metadata = self._artifact.get("metadata", {})
        self.version = self.metadata.get("version", "1.0.0")

    def _load_artifact(self) -> dict[str, Any]:
        if not self.model_path.exists():
            # If not yet trained, trigger training
            from training.train_payment_model import train_and_save_model

            train_and_save_model(output_path=self.model_path)
        return joblib.load(self.model_path)

    def predict(self, payment: PaymentInput) -> PaymentRiskResult:
        """Score a payment input and return probability, level, and top factors."""
        x_input = np.array(
            [
                [
                    payment.amount_band,
                    payment.recipient_status,
                    payment.channel,
                    float(payment.urgency),
                    float(payment.hour),
                ]
            ],
            dtype=object,
        )

        prob = float(self.pipeline.predict_proba(x_input)[0, 1])

        # Step 4 from Section 10.3:
        # under 0.40: Low, 0.40–0.74: Medium, 0.75 and over: High
        if prob < 0.40:
            candidate_level = "Low"
        elif prob < 0.75:
            candidate_level = "Medium"
        else:
            candidate_level = "High"

        # Compute top contributing factors
        factors = self._explain(payment)

        return PaymentRiskResult(
            probability=round(prob, 4),
            candidate_level=candidate_level,
            top_factors=factors,
            model_version=self.version,
            simulated=True,
        )

    def _explain(self, payment: PaymentInput) -> list[RiskFactor]:
        """Derive top risk factors from active model feature coefficients."""
        factors: list[RiskFactor] = []

        preprocessor = self.pipeline.named_steps["preprocessor"]
        clf = self.pipeline.named_steps["classifier"]
        coefs = clf.coef_[0]

        # Get categorical feature names
        cat_names = preprocessor.transformers_[0][1].get_feature_names_out(
            ["amount_band", "recipient_status", "channel"]
        )
        cat_transformed = preprocessor.transformers_[0][1].transform(
            [[payment.amount_band, payment.recipient_status, payment.channel]]
        )[0]

        # Check categorical contributions
        for name, active, weight in zip(
            cat_names, cat_transformed, coefs[: len(cat_names)], strict=False
        ):
            if active == 1.0 and weight > 0.15:
                desc_en, desc_bn = _FACTOR_DESCRIPTIONS.get(
                    name,
                    (f"Active factor: {name}", f"ঝুঁকিপূর্ণ বিষয়: {name}"),
                )
                factors.append(
                    RiskFactor(
                        feature=name,
                        weight=round(float(weight), 3),
                        description_en=desc_en,
                        description_bn=desc_bn,
                    )
                )

        # Check urgency
        urgency_idx = len(cat_names)
        urg_weight = coefs[urgency_idx]
        if payment.urgency == 1 and urg_weight > 0.1:
            desc_en, desc_bn = _FACTOR_DESCRIPTIONS["urgency"]
            factors.append(
                RiskFactor(
                    feature="urgency",
                    weight=round(float(urg_weight), 3),
                    description_en=desc_en,
                    description_bn=desc_bn,
                )
            )

        # Check hour (late night 0-5)
        hour_idx = len(cat_names) + 1
        if 0 <= payment.hour <= 5 or payment.hour >= 23:
            desc_en, desc_bn = _FACTOR_DESCRIPTIONS["hour"]
            factors.append(
                RiskFactor(
                    feature="hour",
                    weight=round(float(coefs[hour_idx]), 3),
                    description_en=desc_en,
                    description_bn=desc_bn,
                )
            )

        # Sort factors by weight descending
        factors.sort(key=lambda f: f.weight, reverse=True)
        return factors[:3]


_MODEL_INSTANCE: PaymentRiskModel | None = None


def get_payment_risk_model() -> PaymentRiskModel:
    """Return the cached PaymentRiskModel singleton."""
    global _MODEL_INSTANCE
    if _MODEL_INSTANCE is None:
        _MODEL_INSTANCE = PaymentRiskModel()
    return _MODEL_INSTANCE


def predict_payment_risk(
    amount: Decimal | float | int | str,
    *,
    recipient_status: str = "new",
    channel: str = "app",
    urgency: bool | int = 0,
    hour: int = 12,
) -> PaymentRiskResult:
    """Convenience functional interface to score payment risk."""
    payment = PaymentInput.from_values(
        amount=amount,
        recipient_status=recipient_status,
        channel=channel,
        urgency=urgency,
        hour=hour,
    )
    return get_payment_risk_model().predict(payment)
