"""Scam campaign clustering (Doc 02 Feature F27).

Groups reported messages using sklearn.cluster.HDBSCAN over message embeddings.
Falls back to empty clusters if fewer than min_cluster_size (default 5) messages exist.
"""

from __future__ import annotations

import logging
from uuid import UUID

import numpy as np
from sklearn.cluster import HDBSCAN

logger = logging.getLogger(__name__)


def cluster_embeddings(
    check_ids: list[UUID],
    embeddings: np.ndarray | list[list[float]],
    min_cluster_size: int = 5,
) -> dict[int, list[UUID]]:
    """Cluster check embeddings using HDBSCAN with min_cluster_size=5.

    Returns a dict mapping cluster index (>= 0) to a list of member check_ids.
    Noise points (label -1) are excluded.
    """
    if len(check_ids) < min_cluster_size:
        logger.info(
            "Fewer than %d embeddings provided (%d); returning no clusters",
            min_cluster_size,
            len(check_ids),
        )
        return {}

    X = np.asarray(embeddings, dtype=np.float32)
    if X.ndim != 2 or X.shape[0] != len(check_ids):
        raise ValueError(
            f"Embeddings shape {X.shape} does not match check_ids ({len(check_ids)})"
        )

    # Normalize vectors to unit length so Euclidean distance matches cosine distance
    norms = np.linalg.norm(X, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    X_norm = X / norms

    clusterer = HDBSCAN(
        min_cluster_size=min_cluster_size,
        min_samples=min(min_cluster_size, 3),
        metric="euclidean",
    )
    labels = clusterer.fit_predict(X_norm)

    clusters: dict[int, list[UUID]] = {}
    for idx, label in enumerate(labels):
        if label >= 0:
            clusters.setdefault(int(label), []).append(check_ids[idx])

    return clusters


def generate_default_campaign_label(
    scam_type_name: str | None = None,
    most_common_words: str | None = None,
    index: int = 1,
) -> str:
    """Generate a clean initial label for newly identified clusters."""
    if scam_type_name:
        return f"{scam_type_name} pattern #{index}"
    if most_common_words:
        return f"Campaign ({most_common_words[:30]})"
    return f"Unclassified campaign #{index}"
