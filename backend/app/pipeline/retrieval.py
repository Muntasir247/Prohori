"""Hybrid knowledge retrieval module.

Implements hybrid keyword, trigram, and vector retrieval with Reciprocal Rank
Fusion (RRF, k=60, top 4) plus one HyDE retry on weak results.
Falls back to keyword-only when embeddings fail.
See ``docs/PROHORI_DOC02.md`` Section 10.4.
"""

from __future__ import annotations

import collections
import logging
import math
import re
from pathlib import Path
from typing import Any

import joblib

from app.config import get_settings
from app.llm.client import ClaudeClient
from app.llm.prompts import p6

logger = logging.getLogger("prohori.retrieval")

_CACHE_FILE = Path(__file__).resolve().parent / "models" / "kb_chunks.joblib"
if (
    not _CACHE_FILE.exists()
    and Path("backend/app/pipeline/models/kb_chunks.joblib").exists()
):
    _CACHE_FILE = Path("backend/app/pipeline/models/kb_chunks.joblib").resolve()
elif not _CACHE_FILE.exists() and Path("app/pipeline/models/kb_chunks.joblib").exists():
    _CACHE_FILE = Path("app/pipeline/models/kb_chunks.joblib").resolve()


def compute_deterministic_vector(text: str, dim: int = 1024) -> list[float]:
    """Deterministic normalized pseudo-embedding when Voyage API key is absent."""
    import hashlib

    vec = [0.0] * dim
    words = re.findall(r"\w+", text.lower())
    for w in words:
        h = int(hashlib.sha256(w.encode("utf-8")).hexdigest(), 16)
        idx = h % dim
        sign = 1.0 if ((h >> 8) & 1) else -1.0
        vec[idx] += sign
    norm = math.sqrt(sum(x * x for x in vec))
    if norm > 0:
        vec = [x / norm for x in vec]
    else:
        vec[0] = 1.0
    return vec


def _cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    """Compute cosine similarity between two float vectors."""
    dot = sum(a * b for a, b in zip(vec_a, vec_b, strict=False))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def _extract_trigrams(text: str) -> set[str]:
    """Extract character trigrams for trigram similarity (like pg_trgm)."""
    text_clean = re.sub(r"\s+", " ", f"  {text.lower()}  ")
    return {text_clean[i : i + 3] for i in range(len(text_clean) - 2)}


def _trigram_similarity(set_a: set[str], set_b: set[str]) -> float:
    """Compute Dice coefficient on character trigrams."""
    if not set_a or not set_b:
        return 0.0
    intersection = len(set_a.intersection(set_b))
    return (2.0 * intersection) / (len(set_a) + len(set_b))


def _keyword_score(query_words: set[str], text: str, title: str) -> float:
    """Simple term-frequency matching score representing Postgres plainto_tsquery."""
    text_words = set(re.findall(r"\w+", text.lower()))
    title_words = set(re.findall(r"\w+", title.lower()))
    score = 0.0
    for qw in query_words:
        if qw in title_words:
            score += 3.0
        if qw in text_words:
            score += 1.0
    return score


class RetrievalEngine:
    """Hybrid search engine over knowledge base chunks."""

    def __init__(self, chunks: list[dict[str, Any]] | None = None) -> None:
        self.settings = get_settings()
        self.chunks: list[dict[str, Any]] = []

        if chunks is not None:
            self.chunks = chunks
        else:
            self.reload_chunks()

    def reload_chunks(self) -> None:
        """Reload chunks from disk cache."""
        if _CACHE_FILE.exists():
            try:
                data = joblib.load(_CACHE_FILE)
                self.chunks = data.get("chunks", [])
            except Exception as exc:
                logger.warning("Could not load kb_chunks from cache file: %s", exc)

    def _embed_query(self, query: str) -> list[float] | None:
        """Embed a single query using Voyage AI or return None on failure."""
        if not self.settings.voyage_api_key or not self.settings.voyage_api_key.strip():
            # Use deterministic vectors for offline testing
            return compute_deterministic_vector(query, 1024)

        try:
            import voyageai

            client = voyageai.Client(api_key=self.settings.voyage_api_key)
            res = client.embed(
                texts=[query],
                model=self.settings.voyage_model,
                output_dimension=1024,
            )
            return res.embeddings[0]
        except Exception as exc:
            logger.warning(
                "Voyage embedding failed (%s); falling back to keyword only", exc
            )
            return None

    def search(
        self,
        query: str,
        *,
        claude_client: ClaudeClient | None = None,
        k: int = 60,
        top_n: int = 4,
        weak_threshold: float = 0.65,
    ) -> list[dict[str, Any]]:
        """Perform hybrid retrieval with RRF fusion, k=60, top 4.

        If top vector similarity < weak_threshold, triggers HyDE once.
        If embeddings fail, falls back to keyword only.
        """
        if not self.chunks:
            return []

        # 1. Trigram search
        q_trigrams = _extract_trigrams(query)
        trigram_scores = [
            (i, _trigram_similarity(q_trigrams, _extract_trigrams(c["content"])))
            for i, c in enumerate(self.chunks)
        ]
        trigram_ranked = sorted(trigram_scores, key=lambda x: x[1], reverse=True)[:20]

        # 2. Keyword search
        q_words = set(re.findall(r"\w+", query.lower()))
        keyword_scores = [
            (i, _keyword_score(q_words, c["content"], c["title"]))
            for i, c in enumerate(self.chunks)
        ]
        keyword_ranked = sorted(keyword_scores, key=lambda x: x[1], reverse=True)[:20]

        # 3. Vector search
        query_vec = self._embed_query(query)
        vector_ranked: list[tuple[int, float]] = []
        top_vector_sim = 0.0

        if query_vec is not None:
            vector_scores = [
                (i, _cosine_similarity(query_vec, c["embedding"]))
                for i, c in enumerate(self.chunks)
                if c.get("embedding") is not None
            ]
            vector_ranked = sorted(vector_scores, key=lambda x: x[1], reverse=True)[:20]
            if vector_ranked:
                top_vector_sim = vector_ranked[0][1]

            # 4. HyDE check: weak signal under threshold triggers HyDE once
            if top_vector_sim < weak_threshold and claude_client is not None:
                try:
                    logger.info(
                        "Top vector similarity %.3f < %.3f; triggering HyDE",
                        top_vector_sim,
                        weak_threshold,
                    )
                    hyde_text = claude_client.call_plain_text(
                        system=p6.build_system_blocks(),
                        prompt=p6.build_user_payload(query),
                        max_tokens=150,
                    )
                    if hyde_text:
                        hyde_vec = self._embed_query(hyde_text)
                        if hyde_vec is not None:
                            hyde_scores = [
                                (i, _cosine_similarity(hyde_vec, c["embedding"]))
                                for i, c in enumerate(self.chunks)
                                if c.get("embedding") is not None
                            ]
                            hyde_ranked = sorted(
                                hyde_scores, key=lambda x: x[1], reverse=True
                            )[:20]
                            # If HyDE produced a stronger top score, merge or use it
                            if hyde_ranked and hyde_ranked[0][1] > top_vector_sim:
                                vector_ranked = hyde_ranked
                except Exception as exc:
                    logger.warning(
                        "HyDE generation failed (%s); continuing with standard results",
                        exc,
                    )

        # 5. Reciprocal Rank Fusion (RRF)
        # RRF(d) = sum_{sources} 1 / (k + rank)
        rrf_scores: dict[int, float] = collections.defaultdict(float)

        for rank, (idx, _) in enumerate(trigram_ranked, start=1):
            rrf_scores[idx] += 1.0 / (k + rank)

        for rank, (idx, _) in enumerate(keyword_ranked, start=1):
            rrf_scores[idx] += 1.0 / (k + rank)

        if vector_ranked:
            for rank, (idx, _) in enumerate(vector_ranked, start=1):
                rrf_scores[idx] += 1.0 / (k + rank)

        # Sort by RRF score descending and take top_n
        top_indices = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)[
            :top_n
        ]

        results: list[dict[str, Any]] = []
        for idx, score in top_indices:
            chunk = self.chunks[idx]
            results.append(
                {
                    "code": chunk.get("document_code") or chunk.get("code", ""),
                    "title": chunk["title"],
                    "text": chunk["content"],
                    "content": chunk["content"],
                    "scam_type_id": chunk.get("scam_type_id"),
                    "rrf_score": round(score, 5),
                }
            )

        return results


def format_known_patterns_block(patterns: list[dict[str, Any]]) -> str:
    """Format retrieved patterns for inclusion in Prompt P2 <known_patterns>."""
    if not patterns:
        return ""
    lines = []
    for p in patterns:
        lines.append(f"- code: {p['code']} | title: {p['title']}\n  text: {p['text']}")
    return "\n".join(lines)
