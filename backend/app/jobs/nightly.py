"""Nightly batch job (Doc 02 Section 9, Feature F26).

Idempotent:
1. Recounts risky_numbers (check_count, report_count, high_count, first/last_seen).
2. Rebuilds daily_aggregates for all historical days before today.
3. Embeds reported masked messages with 1024-dim vectors into check_embeddings.
4. Clusters embeddings with sklearn.cluster.HDBSCAN (min_cluster_size=5).
5. Upserts campaigns without destroying reviewer-edited labels.
6. Sets is_surging when count_7d >= 10 and count_7d >= 2 * prev_count_7d.
7. Deletes unreported guest checks older than 30 days.

Can be run via CLI: python -m app.jobs.nightly (or make nightly).
"""

from __future__ import annotations

import asyncio
import hashlib
import logging
import math
import os
import re
from datetime import UTC, date, datetime, timedelta
from typing import Any

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.analytics.clusters import (
    cluster_embeddings,
    generate_default_campaign_label,
)
from app.db import get_sessionmaker
from app.models.base import utcnow
from app.models.check import (
    Campaign,
    Case,
    Check,
    CheckEmbedding,
    CheckNumber,
    DailyAggregate,
    RiskyNumber,
    ScamType,
)

logger = logging.getLogger(__name__)


def compute_deterministic_1024_embedding(text: str) -> list[float]:
    """Deterministic normalized 1024-dim embedding for offline/fallback use.

    Uses word and character 3-gram hashes to produce stable vectors where similar
    masked messages land close together in cosine space.
    """
    dim = 1024
    vec = [0.0] * dim
    clean_text = text.lower()
    words = re.findall(r"\w+", clean_text)
    for w in words:
        h = int(hashlib.sha256(w.encode("utf-8")).hexdigest(), 16)
        vec[h % dim] += 1.0

    # 3-grams for substring similarity
    for i in range(len(clean_text) - 2):
        gram = clean_text[i : i + 3]
        h = int(hashlib.sha256(gram.encode("utf-8")).hexdigest(), 16)
        vec[h % dim] += 0.5

    norm = math.sqrt(sum(v * v for v in vec))
    if norm > 0:
        vec = [v / norm for v in vec]
    return vec


async def recount_risky_numbers(session: AsyncSession) -> int:
    """Recount check_count, report_count, high_count and seen timestamps."""
    numbers = (await session.scalars(select(RiskyNumber))).all()
    count_updated = 0

    for num in numbers:
        # Check counts
        stmt_checks = (
            select(
                func.count(func.distinct(CheckNumber.check_id)),
                func.min(Check.created_at),
                func.max(Check.created_at),
            )
            .select_from(CheckNumber)
            .join(Check, CheckNumber.check_id == Check.id)
            .where(CheckNumber.number_id == num.id)
        )
        res_checks = (await session.execute(stmt_checks)).one()
        c_count = res_checks[0] or 0
        first_seen = res_checks[1] or num.first_seen_at
        last_seen = res_checks[2] or num.last_seen_at

        # High checks count
        stmt_high = (
            select(func.count(func.distinct(CheckNumber.check_id)))
            .select_from(CheckNumber)
            .join(Check, CheckNumber.check_id == Check.id)
            .where(CheckNumber.number_id == num.id, Check.final_level == "High")
        )
        high_count = (await session.execute(stmt_high)).scalar() or 0

        # Report count (cases linked to checks with this number)
        stmt_reports = (
            select(func.count(func.distinct(Case.id)))
            .select_from(Case)
            .join(CheckNumber, Case.check_id == CheckNumber.check_id)
            .where(CheckNumber.number_id == num.id)
        )
        report_count = (await session.execute(stmt_reports)).scalar() or 0

        num.check_count = c_count
        num.report_count = report_count
        num.high_count = high_count
        num.first_seen_at = first_seen
        num.last_seen_at = last_seen
        count_updated += 1

    await session.flush()
    return count_updated


async def rebuild_daily_aggregates(
    session: AsyncSession, reference_now: datetime | None = None
) -> int:
    """Rebuild daily_aggregates for all days strictly before today."""
    now = reference_now or utcnow()
    today_start = datetime(now.year, now.month, now.day, tzinfo=UTC)

    # Clear historical days to guarantee idempotency
    await session.execute(
        delete(DailyAggregate).where(DailyAggregate.day < today_start.date())
    )

    # Collect checks prior to today
    checks_stmt = select(Check.created_at, Check.final_level, Check.scam_type_id).where(
        Check.created_at < today_start, Check.final_level.isnot(None)
    )
    checks = (await session.execute(checks_stmt)).all()

    # Collect cases prior to today
    cases_stmt = (
        select(
            Case.created_at,
            Check.final_level,
            Case.scam_type_id,
            Case.decided_at,
            Case.status,
        )
        .join(Check, Case.check_id == Check.id)
        .where(Case.created_at < today_start, Check.final_level.isnot(None))
    )
    cases = (await session.execute(cases_stmt)).all()

    agg_map: dict[tuple[date, str, int], dict[str, int]] = {}

    def get_slot(d: date, lvl: str, st_id: int | None) -> dict[str, int]:
        key = (d, lvl, st_id or 0)
        return agg_map.setdefault(
            key,
            {
                "check_count": 0,
                "case_count": 0,
                "decided_count": 0,
                "agreed_count": 0,
            },
        )

    for c in checks:
        c_day = (
            c.created_at.date() if isinstance(c.created_at, datetime) else c.created_at
        )
        get_slot(c_day, c.final_level, c.scam_type_id)["check_count"] += 1

    for cs in cases:
        cs_day = (
            cs.created_at.date()
            if isinstance(cs.created_at, datetime)
            else cs.created_at
        )
        slot = get_slot(cs_day, cs.final_level, cs.scam_type_id)
        slot["case_count"] += 1
        if cs.decided_at is not None:
            slot["decided_count"] += 1
            if cs.status == "confirmed_scam":
                slot["agreed_count"] += 1

    inserted_count = 0
    for (d, lvl, st_id), counts in agg_map.items():
        row = DailyAggregate(
            day=d,
            risk_level=lvl,
            scam_type_id=st_id,
            check_count=counts["check_count"],
            case_count=counts["case_count"],
            decided_count=counts["decided_count"],
            agreed_count=counts["agreed_count"],
        )
        session.add(row)
        inserted_count += 1

    await session.flush()
    return inserted_count


async def embed_reported_messages(session: AsyncSession) -> int:
    """Embed reported check masked texts that do not have embeddings yet."""
    # Find checks that are in cases and don't have check_embeddings yet
    existing_subq = select(CheckEmbedding.check_id)
    stmt = (
        select(Check.id, Check.masked_text)
        .join(Case, Case.check_id == Check.id)
        .where(
            Check.masked_text.isnot(None),
            Check.masked_text != "",
            Check.id.not_in(existing_subq),
        )
    )
    rows = (await session.execute(stmt)).all()
    if not rows:
        return 0

    voyage_key = os.environ.get("VOYAGE_API_KEY")
    voyage_client = None
    if voyage_key and voyage_key.strip() and not voyage_key.startswith("test-"):
        try:
            import voyageai

            voyage_client = voyageai.Client(api_key=voyage_key)
        except Exception as e:
            logger.warning("Could not initialize Voyage AI: %s", e)

    embedded_count = 0
    batch_size = 32
    for i in range(0, len(rows), batch_size):
        batch = rows[i : i + batch_size]
        texts = [r.masked_text for r in batch]
        vectors: list[list[float]] = []

        if voyage_client:
            try:
                res = voyage_client.embed(
                    texts=texts, model="voyage-4", output_dimension=1024
                )
                vectors = res.embeddings
            except Exception as exc:
                logger.warning(
                    "Voyage AI call failed: %s; falling back to deterministic", exc
                )
                vectors = [compute_deterministic_1024_embedding(t) for t in texts]
        else:
            vectors = [compute_deterministic_1024_embedding(t) for t in texts]

        for r, vec in zip(batch, vectors, strict=False):
            emb_row = CheckEmbedding(check_id=r.id, embedding=vec)
            session.add(emb_row)
            embedded_count += 1

    await session.flush()
    return embedded_count


async def cluster_and_upsert_campaigns(
    session: AsyncSession, reference_now: datetime | None = None
) -> tuple[int, int]:
    """Cluster reported checks and upsert campaigns without destroying labels."""
    now = reference_now or utcnow()

    # Load all check_embeddings for checks in cases
    stmt = select(
        CheckEmbedding.check_id,
        CheckEmbedding.embedding,
        Case.id,
        Case.campaign_id,
        Case.scam_type_id,
    ).join(Case, Case.check_id == CheckEmbedding.check_id)
    rows = (await session.execute(stmt)).all()
    if not rows:
        return 0, 0

    check_ids = [r[0] for r in rows]
    embeddings = [r[1] for r in rows]
    case_map = {
        r[0]: {"case_id": r[2], "campaign_id": r[3], "scam_type_id": r[4]} for r in rows
    }

    # Run HDBSCAN
    clusters = cluster_embeddings(check_ids, embeddings, min_cluster_size=5)

    # Scam types lookup
    scam_types = {st.id: st for st in (await session.scalars(select(ScamType))).all()}

    campaigns_created = 0
    for cluster_idx, c_ids in clusters.items():
        # Find existing campaigns among cases in this cluster
        existing_campaign_ids = [
            case_map[cid]["campaign_id"]
            for cid in c_ids
            if case_map[cid]["campaign_id"] is not None
        ]

        target_campaign: Campaign | None = None
        if existing_campaign_ids:
            # Pick the most common existing campaign to preserve reviewer labels
            most_common_id = max(
                set(existing_campaign_ids), key=existing_campaign_ids.count
            )
            target_campaign = await session.get(Campaign, most_common_id)

        if not target_campaign:
            # New campaign needed
            # Determine dominant scam type in cluster
            st_ids = [
                case_map[cid]["scam_type_id"]
                for cid in c_ids
                if case_map[cid]["scam_type_id"] is not None
            ]
            dominant_st = max(set(st_ids), key=st_ids.count) if st_ids else None
            st_name = (
                scam_types[dominant_st].name_en
                if dominant_st and dominant_st in scam_types
                else None
            )
            new_label = generate_default_campaign_label(
                scam_type_name=st_name, index=cluster_idx + 1
            )
            target_campaign = Campaign(
                label=new_label,
                scam_type_id=dominant_st,
                member_count=len(c_ids),
                updated_at=now,
            )
            session.add(target_campaign)
            await session.flush()
            campaigns_created += 1

        # Reassign member cases to target_campaign
        for cid in c_ids:
            case_id = case_map[cid]["case_id"]
            c_case = await session.get(Case, case_id)
            if c_case:
                c_case.campaign_id = target_campaign.id

    await session.flush()

    # Now update stats and surging status for ALL campaigns
    all_campaigns = (await session.scalars(select(Campaign))).all()
    d7_ago = now - timedelta(days=7)
    d14_ago = now - timedelta(days=14)

    campaigns_updated = 0
    for camp in all_campaigns:
        camp_cases = (
            await session.scalars(select(Case).where(Case.campaign_id == camp.id))
        ).all()
        camp.member_count = len(camp_cases)

        if camp_cases:
            first_seen = min(c.created_at for c in camp_cases)
            last_seen = max(c.created_at for c in camp_cases)
            camp.first_seen_at = first_seen
            camp.last_seen_at = last_seen

            c_7d = sum(1 for c in camp_cases if c.created_at >= d7_ago)
            prev_7d = sum(1 for c in camp_cases if d14_ago <= c.created_at < d7_ago)

            camp.count_7d = c_7d
            camp.prev_count_7d = prev_7d
            # F36: count_7d >= 10 and count_7d >= 2 * prev_count_7d
            camp.is_surging = c_7d >= 10 and c_7d >= (2 * prev_7d)
        else:
            camp.count_7d = 0
            camp.prev_count_7d = 0
            camp.is_surging = False

        camp.updated_at = now
        campaigns_updated += 1

    await session.flush()
    return len(clusters), campaigns_updated


async def delete_unreported_guest_checks(
    session: AsyncSession, reference_now: datetime | None = None
) -> int:
    """Delete unreported guest checks older than 30 days (Doc 02 Feature F26)."""
    now = reference_now or utcnow()
    cutoff = now - timedelta(days=30)

    # Subquery: check IDs that are reported in cases
    reported_subq = select(Case.check_id)

    # Delete guest checks older than 30 days with no user_id and no case
    stmt = delete(Check).where(
        Check.user_id.is_(None),
        Check.created_at < cutoff,
        Check.id.not_in(reported_subq),
    )
    res = await session.execute(stmt)
    deleted_count = res.rowcount or 0
    await session.flush()
    return deleted_count


async def run_nightly_job(
    session: AsyncSession | None = None, reference_now: datetime | None = None
) -> dict[str, Any]:
    """Execute all idempotent steps of the nightly job."""
    if session is not None:
        return await _execute_steps(session, reference_now)

    session_factory = get_sessionmaker()
    async with session_factory() as s:
        async with s.begin():
            res = await _execute_steps(s, reference_now)
        return res


async def _execute_steps(
    session: AsyncSession, reference_now: datetime | None = None
) -> dict[str, Any]:
    now = reference_now or utcnow()
    logger.info("Starting nightly job at %s", now.isoformat())

    deleted_guests = await delete_unreported_guest_checks(session, now)
    recounted = await recount_risky_numbers(session)
    rebuilt_agg = await rebuild_daily_aggregates(session, now)
    embedded = await embed_reported_messages(session)
    clusters_count, campaigns_updated = await cluster_and_upsert_campaigns(session, now)

    logger.info(
        "Nightly job completed: recounted %d numbers, %d daily aggregates, "
        "%d embedded, %d clusters, %d campaigns updated, %d guest checks deleted",
        recounted,
        rebuilt_agg,
        embedded,
        clusters_count,
        campaigns_updated,
        deleted_guests,
    )

    return {
        "risky_numbers_recounted": recounted,
        "daily_aggregates_rebuilt": rebuilt_agg,
        "messages_embedded": embedded,
        "clusters_count": clusters_count,
        "campaigns_updated": campaigns_updated,
        "unreported_guests_deleted": deleted_guests,
        "timestamp": now.isoformat(),
    }


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    asyncio.run(run_nightly_job())


if __name__ == "__main__":
    main()
