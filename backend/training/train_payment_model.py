"""Synthetic payment record generation and logistic regression model training.

Adheres strictly to Doc 02 Section 10.1 and F06:
- Scikit-learn logistic regression on amount band, recipient status,
  channel, urgency, and hour.
- Versioned joblib artifact saved with all metrics explicitly labelled 'simulated'.
- Coefficients saved to derive human-readable top risk factors.
"""

from __future__ import annotations

import json
import random
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import joblib
import numpy as np
from sklearn.compose import ColumnTransformer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

# --------------------------------------------------------------------------- #
# Categorical and numerical domains
# --------------------------------------------------------------------------- #

AMOUNT_BANDS = ["very_low", "low", "medium", "high", "very_high"]
RECIPIENT_STATUSES = ["known", "frequent", "new", "suspicious"]
CHANNELS = ["app", "ussd", "agent", "sms_link", "web"]


def assign_amount_band(amount_bdt: float) -> str:
    """Map a numerical BDT amount to its categorical band."""
    if amount_bdt < 500:
        return "very_low"
    if amount_bdt < 2000:
        return "low"
    if amount_bdt < 10000:
        return "medium"
    if amount_bdt < 50000:
        return "high"
    return "very_high"


# --------------------------------------------------------------------------- #
# Synthetic Data Generation
# --------------------------------------------------------------------------- #


def generate_synthetic_payments(
    n_samples: int = 6000,
    seed: int = 42,
) -> list[dict[str, Any]]:
    """Generate realistic synthetic payment records with labeled simulated ground truth.

    Fraud propensity is simulated using domain-informed risk rules:
    - New or suspicious recipients + high urgency + late-night hours + SMS links
      have the highest probability of fraud.
    - Frequent or known recipients on official mobile apps during normal hours
      have very low fraud probability.
    """
    rng = random.Random(seed)
    records: list[dict[str, Any]] = []

    for _ in range(n_samples):
        # Sample features
        amount_band = rng.choices(
            AMOUNT_BANDS,
            weights=[0.30, 0.35, 0.20, 0.10, 0.05],
        )[0]
        recipient_status = rng.choices(
            RECIPIENT_STATUSES,
            weights=[0.45, 0.30, 0.20, 0.05],
        )[0]
        channel = rng.choices(
            CHANNELS,
            weights=[0.55, 0.25, 0.10, 0.06, 0.04],
        )[0]
        urgency = 1 if rng.random() < 0.22 else 0
        hour = rng.randint(0, 23)

        # Calculate latent fraud risk score
        risk_score = 0.0

        # Amount band contribution
        if amount_band == "very_high":
            risk_score += 1.8
        elif amount_band == "high":
            risk_score += 1.0
        elif amount_band == "medium":
            risk_score += 0.3
        elif amount_band == "very_low":
            risk_score -= 0.6

        # Recipient status contribution
        if recipient_status == "suspicious":
            risk_score += 2.5
        elif recipient_status == "new":
            risk_score += 1.4
        elif recipient_status == "known":
            risk_score -= 0.8
        elif recipient_status == "frequent":
            risk_score -= 1.5

        # Channel contribution
        if channel == "sms_link":
            risk_score += 2.0
        elif channel == "web":
            risk_score += 1.0
        elif channel == "agent":
            risk_score += 0.4
        elif channel == "app":
            risk_score -= 0.7

        # Urgency contribution
        if urgency == 1:
            risk_score += 1.3

        # Hour contribution (late night hours 0-5 have higher risk)
        if 0 <= hour <= 5:
            risk_score += 1.2
        elif 22 <= hour <= 23:
            risk_score += 0.5

        # Logistic sigmoid probability with noise
        logit = risk_score - 2.8 + rng.gauss(0.0, 0.4)
        prob = 1.0 / (1.0 + np.exp(-logit))
        is_fraud = 1 if prob >= 0.50 else 0

        records.append(
            {
                "amount_band": amount_band,
                "recipient_status": recipient_status,
                "channel": channel,
                "urgency": urgency,
                "hour": hour,
                "is_fraud": is_fraud,
            }
        )

    return records


# --------------------------------------------------------------------------- #
# Training Pipeline
# --------------------------------------------------------------------------- #


def train_and_save_model(
    output_path: Path | str | None = None,
    n_samples: int = 6000,
    seed: int = 42,
) -> dict[str, Any]:
    """Train logistic regression model on payment records and save joblib artifact."""
    if output_path is None:
        # Save to backend/app/pipeline/models/payment_risk_model.joblib
        base_dir = (
            Path(__file__).resolve().parent.parent / "app" / "pipeline" / "models"
        )
        base_dir.mkdir(parents=True, exist_ok=True)
        output_path = base_dir / "payment_risk_model.joblib"
    else:
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

    print(f"Generating {n_samples} synthetic payment records (seed={seed})...")
    data = generate_synthetic_payments(n_samples=n_samples, seed=seed)

    x_matrix = np.array(
        [
            [
                d["amount_band"],
                d["recipient_status"],
                d["channel"],
                float(d["urgency"]),
                float(d["hour"]),
            ]
            for d in data
        ],
        dtype=object,
    )
    y = np.array([d["is_fraud"] for d in data], dtype=int)

    # Stratified split 80% train, 20% test
    x_train, x_test, y_train, y_test = train_test_split(
        x_matrix,
        y,
        test_size=0.20,
        random_state=seed,
        stratify=y,
    )

    categorical_indices = [0, 1, 2]
    numerical_indices = [3, 4]

    preprocessor = ColumnTransformer(
        transformers=[
            (
                "cat",
                OneHotEncoder(
                    categories=[AMOUNT_BANDS, RECIPIENT_STATUSES, CHANNELS],
                    handle_unknown="ignore",
                    sparse_output=False,
                ),
                categorical_indices,
            ),
            (
                "num",
                StandardScaler(),
                numerical_indices,
            ),
        ]
    )

    clf = LogisticRegression(
        class_weight="balanced",
        max_iter=1000,
        random_state=seed,
    )

    pipeline = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("classifier", clf),
        ]
    )

    print("Training LogisticRegression pipeline...")
    pipeline.fit(x_train, y_train)

    # Evaluate on held-out test split
    y_pred = pipeline.predict(x_test)
    y_prob = pipeline.predict_proba(x_test)[:, 1]

    metrics = {
        "data_type": "simulated",
        "simulated": True,  # Labeled simulated explicitly
        "sample_count": n_samples,
        "test_sample_count": len(y_test),
        "fraud_rate": float(np.mean(y)),
        "accuracy": float(round(accuracy_score(y_test, y_pred), 4)),
        "precision": float(round(precision_score(y_test, y_pred), 4)),
        "recall": float(round(recall_score(y_test, y_pred), 4)),
        "f1": float(round(f1_score(y_test, y_pred), 4)),
        "roc_auc": float(round(roc_auc_score(y_test, y_prob), 4)),
    }

    # Extract feature names and weights for top factor explanations
    cat_names = (
        pipeline.named_steps["preprocessor"]
        .transformers_[0][1]
        .get_feature_names_out(["amount_band", "recipient_status", "channel"])
    )
    num_names = ["urgency", "hour"]
    all_feature_names = list(cat_names) + list(num_names)
    coefficients = pipeline.named_steps["classifier"].coef_[0]

    feature_weights = dict(
        zip(all_feature_names, [float(c) for c in coefficients], strict=False)
    )

    metadata = {
        "model_type": "LogisticRegression",
        "version": "1.0.0",
        "created_at": datetime.now(UTC).isoformat(),
        "simulated": True,
        "metrics": metrics,
        "feature_weights": feature_weights,
        "categorical_domains": {
            "amount_band": AMOUNT_BANDS,
            "recipient_status": RECIPIENT_STATUSES,
            "channel": CHANNELS,
        },
    }

    artifact = {
        "pipeline": pipeline,
        "metadata": metadata,
    }

    joblib.dump(artifact, output_path)
    print(f"Saved simulated model artifact to: {output_path}")
    print(f"Metrics (simulated): {json.dumps(metrics, indent=2)}")

    return metadata


if __name__ == "__main__":
    train_and_save_model()
