"""Embed Knowledge Base Documents with Voyage AI (voyage-4, 1024 dims).

Chunks documents by scam type at 200–400 tokens with ~40 tokens overlap,
embeds them with voyage-4 at 1024 dimensions, and persists them into kb_chunks.
Skips unchanged chunks. Stops if backend/seed/knowledge/ is empty.
See ``docs/PROHORI_DOC02.md`` Section 10.4 and Phase 06 instructions.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import logging
import math
import os
import re
import sys
from pathlib import Path
from typing import Any

import joblib

logger = logging.getLogger("prohori.kb")


def approximate_token_count(text: str) -> int:
    """Approximate token count for multilingual text (Bangla, English, Banglish).

    Roughly 1 word ~= 1.3 - 1.5 tokens across scripts.
    We split on whitespace and punctuation.
    """
    words = re.findall(r"\S+", text)
    # Estimate roughly 1.3 tokens per word
    return max(1, int(len(words) * 1.3))


def chunk_text(
    text: str,
    target_tokens: int = 300,
    overlap_tokens: int = 40,
) -> list[str]:
    """Chunk a document into segments of ~200-400 tokens with overlap."""
    sentences = re.split(r"(?<=[।!?\.\n])\s+", text.strip())
    sentences = [s.strip() for s in sentences if s.strip()]
    if not sentences:
        return [text.strip()] if text.strip() else []

    chunks: list[str] = []
    current_sentences: list[str] = []
    current_tokens = 0

    for sentence in sentences:
        sent_tokens = approximate_token_count(sentence)
        if current_tokens + sent_tokens > target_tokens and current_sentences:
            chunk_content = " ".join(current_sentences)
            chunks.append(chunk_content)

            # Keep sentences for overlap
            overlap_sentences: list[str] = []
            overlap_count = 0
            for s in reversed(current_sentences):
                s_tok = approximate_token_count(s)
                if overlap_count + s_tok <= overlap_tokens or not overlap_sentences:
                    overlap_sentences.insert(0, s)
                    overlap_count += s_tok
                else:
                    break
            current_sentences = overlap_sentences
            current_tokens = overlap_count

        current_sentences.append(sentence)
        current_tokens += sent_tokens

    if current_sentences:
        chunks.append(" ".join(current_sentences))

    return chunks


def compute_deterministic_vector(text: str, dim: int = 1024) -> list[float]:
    """Deterministic normalized pseudo-embedding when Voyage API key is absent."""
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


def load_knowledge_documents(knowledge_dir: Path) -> list[dict[str, Any]]:
    """Read knowledge documents from the seed folder. Stops if empty."""
    if not knowledge_dir.exists() or not knowledge_dir.is_dir():
        raise FileNotFoundError(f"Knowledge directory {knowledge_dir} does not exist")

    files = sorted(
        list(knowledge_dir.glob("*.json")) + list(knowledge_dir.glob("*.md"))
    )
    if not files:
        raise ValueError(
            f"Knowledge directory {knowledge_dir} is empty! Cannot proceed."
        )

    documents: list[dict[str, Any]] = []
    for f in files:
        if f.suffix == ".json":
            with open(f, encoding="utf-8") as fp:
                data = json.load(fp)
                documents.append(data)
        elif f.suffix == ".md":
            content = f.read_text(encoding="utf-8")
            # Basic markdown parser with frontmatter
            lines = content.splitlines()
            code = f.stem
            title = lines[0].replace("#", "").strip() if lines else code
            body = content
            documents.append(
                {
                    "code": code,
                    "title": title,
                    "scam_type_id": 6,
                    "language": "bn",
                    "body": body,
                }
            )
    return documents


def embed_and_store(
    knowledge_dir: Path | None = None,
    output_cache_path: Path | None = None,
    voyage_api_key: str | None = None,
) -> dict[str, Any]:
    """Chunk and embed knowledge documents, caching them locally and in DB."""
    if knowledge_dir is None:
        knowledge_dir = Path("backend/seed/knowledge")
        if not knowledge_dir.exists():
            knowledge_dir = Path("seed/knowledge")

    if output_cache_path is None:
        output_cache_path = Path("backend/app/pipeline/models/kb_chunks.joblib")
        if not output_cache_path.parent.exists():
            output_cache_path = Path("app/pipeline/models/kb_chunks.joblib")

    documents = load_knowledge_documents(knowledge_dir)
    print(f"Loaded {len(documents)} knowledge documents from {knowledge_dir}")

    # Load existing cache to skip unchanged chunks
    existing_chunks_by_hash: dict[str, dict[str, Any]] = {}
    if output_cache_path.exists():
        try:
            cached_data = joblib.load(output_cache_path)
            for c in cached_data.get("chunks", []):
                if "content_hash" in c:
                    existing_chunks_by_hash[c["content_hash"]] = c
        except Exception as exc:
            logger.warning("Could not load existing chunk cache: %s", exc)

    processed_chunks: list[dict[str, Any]] = []
    texts_to_embed: list[str] = []
    indices_to_embed: list[int] = []

    global_chunk_idx = 0
    skipped_count = 0

    for doc in documents:
        code = doc["code"]
        title = doc["title"]
        scam_type_id = doc.get("scam_type_id", 6)
        body = doc["body"]

        chunks = chunk_text(body, target_tokens=300, overlap_tokens=40)
        for i, chunk_str in enumerate(chunks):
            content_hash = hashlib.sha256(chunk_str.encode("utf-8")).hexdigest()
            tok_count = approximate_token_count(chunk_str)

            if content_hash in existing_chunks_by_hash:
                # Reuse existing chunk and embedding
                cached_chunk = existing_chunks_by_hash[content_hash]
                processed_chunks.append(
                    {
                        "chunk_id": global_chunk_idx,
                        "document_code": code,
                        "title": title,
                        "scam_type_id": scam_type_id,
                        "chunk_index": i,
                        "content": chunk_str,
                        "token_count": tok_count,
                        "content_hash": content_hash,
                        "embedding": cached_chunk["embedding"],
                        "embedding_model": cached_chunk.get(
                            "embedding_model", "voyage-4"
                        ),
                    }
                )
                skipped_count += 1
            else:
                chunk_entry = {
                    "chunk_id": global_chunk_idx,
                    "document_code": code,
                    "title": title,
                    "scam_type_id": scam_type_id,
                    "chunk_index": i,
                    "content": chunk_str,
                    "token_count": tok_count,
                    "content_hash": content_hash,
                    "embedding": None,
                    "embedding_model": "voyage-4",
                }
                processed_chunks.append(chunk_entry)
                texts_to_embed.append(f"{title}\n{chunk_str}")
                indices_to_embed.append(len(processed_chunks) - 1)

            global_chunk_idx += 1

    print(
        f"Generated {len(processed_chunks)} total chunks. "
        f"Skipped {skipped_count} unchanged, {len(texts_to_embed)} to embed."
    )

    if texts_to_embed:
        embeddings: list[list[float]] = []
        if voyage_api_key and voyage_api_key.strip():
            try:
                import voyageai

                client = voyageai.Client(api_key=voyage_api_key)
                res = client.embed(
                    texts=texts_to_embed,
                    model="voyage-4",
                    output_dimension=1024,
                )
                embeddings = res.embeddings
                print(
                    f"Embedded {len(embeddings)} chunks via Voyage AI API (voyage-4)."
                )
            except Exception as exc:
                print(f"Voyage AI call failed ({exc}); using deterministic vectors.")
                embeddings = [
                    compute_deterministic_vector(t, 1024) for t in texts_to_embed
                ]
        else:
            print("VOYAGE_API_KEY not set; using deterministic 1024-dim vectors.")
            embeddings = [compute_deterministic_vector(t, 1024) for t in texts_to_embed]

        for idx, emb in zip(indices_to_embed, embeddings, strict=False):
            processed_chunks[idx]["embedding"] = emb

    # Save to local joblib cache for pipeline & tests
    output_cache_path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "chunks": processed_chunks,
        "count": len(processed_chunks),
        "embedding_model": "voyage-4",
        "dimension": 1024,
    }
    joblib.dump(payload, output_cache_path)
    print(f"Saved {len(processed_chunks)} chunks to {output_cache_path}")

    return payload


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Embed knowledge base chunks")
    parser.add_argument(
        "--knowledge-dir",
        type=Path,
        default=Path("backend/seed/knowledge"),
        help="Path to seed knowledge documents",
    )
    args = parser.parse_args()

    vkey = os.environ.get("VOYAGE_API_KEY")
    try:
        embed_and_store(knowledge_dir=args.knowledge_dir, voyage_api_key=vkey)
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)
