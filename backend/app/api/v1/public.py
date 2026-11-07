"""Public reference data endpoints (Doc 02 Section 9).

GET /safe-actions
GET /samples
GET /tips/current
"""

from __future__ import annotations

import json
from datetime import UTC, datetime
from functools import lru_cache
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Query, Response
from sqlalchemy import select

from app.api.deps import DbSession
from app.models.knowledge import SafeAction, Sample, Tip
from app.schemas.checks import SafeActionResponse, SampleResponse, TipResponse

router = APIRouter(tags=["public"])

SEED_DIR = Path("backend/seed")
if not SEED_DIR.exists():
    SEED_DIR = Path("seed")


@lru_cache(maxsize=8)
def _load_seed_json(filename: str) -> list[dict[str, Any]]:
    path = SEED_DIR / filename
    if path.exists():
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    return []


@router.get("/safe-actions", response_model=list[SafeActionResponse])
async def list_safe_actions(
    session: DbSession,
    context: str | None = Query(None, pattern="^(before_payment|after_payment|both)$"),
    provider: str | None = None,
) -> list[SafeActionResponse]:
    stmt = (
        select(SafeAction)
        .where(SafeAction.is_active == True)  # noqa: E712
        .order_by(SafeAction.sort_order.asc())
    )
    if context:
        stmt = stmt.where(SafeAction.context.in_([context, "both"]))
    if provider:
        stmt = stmt.where(SafeAction.provider == provider)

    rows = (await session.execute(stmt)).scalars().all()
    if rows:
        return [
            SafeActionResponse(
                id=r.id,
                label_en=r.label_en,
                label_bn=r.label_bn,
                body_en=r.body_en,
                body_bn=r.body_bn,
                context=r.context,
                min_level=r.min_level,
                provider=r.provider,
                phone=r.phone,
                source_url=r.source_url,
                verified_at=r.verified_at,
                is_active=r.is_active,
            )
            for r in rows
        ]

    # Fallback to seed JSON if table not populated yet
    data = _load_seed_json("safe_actions.json")
    res = []
    for item in data:
        if not item.get("is_active", True):
            continue
        if context and item.get("context") not in (context, "both"):
            continue
        if provider and item.get("provider") != provider:
            continue
        res.append(SafeActionResponse(**item))
    return res


@router.get("/samples", response_model=list[SampleResponse])
async def list_samples(session: DbSession) -> list[SampleResponse]:
    stmt = select(Sample).order_by(Sample.id.asc())
    rows = (await session.execute(stmt)).scalars().all()
    if rows:
        return [
            SampleResponse(
                id=r.id,
                label_en=r.label_en,
                label_bn=r.label_bn,
                body=r.body,
                language=r.language,
            )
            for r in rows
        ]

    # Fallback to seed JSON
    data = _load_seed_json("samples.json")
    return [SampleResponse(**item) for item in data]


@router.get(
    "/tips/current",
    response_model=None,
    responses={
        200: {"model": TipResponse},
        204: {"description": "No active tip"},
    },
)
async def get_current_tip(
    session: DbSession,
) -> Any:
    today = datetime.now(UTC).date()
    stmt = (
        select(Tip)
        .where(Tip.active_from <= today)
        .order_by(Tip.active_from.desc())
        .limit(1)
    )
    tip = (await session.execute(stmt)).scalar_one_or_none()
    if tip:
        return TipResponse(
            id=tip.id,
            title_en=tip.title_en,
            title_bn=tip.title_bn,
            body_en=tip.body_en,
            body_bn=tip.body_bn,
            active_from=tip.active_from,
        )

    # Fallback to seed JSON
    data = _load_seed_json("tips.json")
    if data:
        first = data[0]
        return TipResponse(**first)

    return Response(status_code=204)
