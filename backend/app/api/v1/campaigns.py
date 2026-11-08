"""Campaign management endpoints (Doc 02 Section 9, F27, S28).

GET /api/v1/campaigns
PATCH /api/v1/campaigns/{id}
"""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc, func, select

from app.api.deps import DbSession, require_role
from app.errors import AppError
from app.models.audit import AuditEvent
from app.models.base import utcnow
from app.models.check import Campaign, Case, Check, CheckNumber, RiskyNumber, ScamType
from app.models.user import User
from app.schemas.campaigns import CampaignItem, CampaignsResponse, UpdateCampaignRequest

router = APIRouter(prefix="/campaigns", tags=["campaigns"])
ReviewerUser = Annotated[User, Depends(require_role("reviewer", "admin"))]


@router.get("", response_model=CampaignsResponse)
async def list_campaigns(
    user: ReviewerUser,
    session: DbSession,
    surging: bool | None = Query(None),
    scam_type: int | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
) -> CampaignsResponse:
    """List campaigns with member counts, 7-day velocity, and sample messages."""
    query = select(Campaign)

    if surging is True:
        query = query.where(Campaign.is_surging.is_(True))

    if scam_type is not None:
        query = query.where(Campaign.scam_type_id == scam_type)

    count_stmt = select(func.count()).select_from(query.subquery())
    total = (await session.execute(count_stmt)).scalar() or 0

    query = (
        query.order_by(
            desc(Campaign.is_surging),
            desc(Campaign.count_7d),
            desc(Campaign.updated_at),
        )
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    campaigns = (await session.scalars(query)).all()

    # Look up scam types
    scam_types = {st.id: st for st in (await session.scalars(select(ScamType))).all()}

    items: list[CampaignItem] = []
    for c in campaigns:
        st = scam_types.get(c.scam_type_id) if c.scam_type_id else None

        # Fetch sample messages and case references
        cases_stmt = (
            select(Case.reference, Check.masked_text, Check.id)
            .join(Check, Case.check_id == Check.id)
            .where(Case.campaign_id == c.id)
            .order_by(desc(Case.created_at))
            .limit(10)
        )
        c_rows = (await session.execute(cases_stmt)).all()
        case_refs = [r[0] for r in c_rows]
        samples = [r[1] for r in c_rows if r[1]][:3]
        check_ids = [r[2] for r in c_rows]

        # Fetch shared numbers
        shared_nums: list[str] = []
        if check_ids:
            num_stmt = (
                select(func.distinct(RiskyNumber.masked_display))
                .select_from(CheckNumber)
                .join(RiskyNumber, CheckNumber.number_id == RiskyNumber.id)
                .where(CheckNumber.check_id.in_(check_ids))
                .limit(5)
            )
            shared_nums = [r[0] for r in (await session.execute(num_stmt)).all()]

        items.append(
            CampaignItem(
                id=c.id,
                label=c.label,
                scam_type_id=c.scam_type_id,
                scam_type_name=st.name_en if st else None,
                scam_type_name_bn=st.name_bn if st else None,
                member_count=c.member_count,
                count_7d=c.count_7d,
                prev_count_7d=c.prev_count_7d,
                is_surging=c.is_surging,
                first_seen_at=c.first_seen_at,
                last_seen_at=c.last_seen_at,
                updated_at=c.updated_at,
                sample_messages=samples,
                shared_numbers=shared_nums,
                case_references=case_refs,
            )
        )

    return CampaignsResponse(items=items, total=total)


@router.patch("/{id}", response_model=CampaignItem)
async def update_campaign(
    id: UUID,
    payload: UpdateCampaignRequest,
    user: ReviewerUser,
    session: DbSession,
) -> CampaignItem:
    """Rename a campaign or merge it into another campaign."""
    camp = await session.get(Campaign, id)
    if not camp:
        raise AppError("not_found", status=404, message_key="errors.not_found")

    now = utcnow()

    if payload.merge_into:
        if payload.merge_into == id:
            raise AppError(
                "validation_failed",
                status=422,
                message_key="errors.cannot_merge_into_self",
            )

        target = await session.get(Campaign, payload.merge_into)
        if not target:
            raise AppError(
                "not_found", status=404, message_key="errors.target_campaign_not_found"
            )

        # Move cases to target
        member_cases = (
            await session.scalars(select(Case).where(Case.campaign_id == id))
        ).all()
        for mc in member_cases:
            mc.campaign_id = target.id

        target.member_count += camp.member_count
        target.count_7d += camp.count_7d
        target.updated_at = now

        # Record audit event
        audit = AuditEvent(
            actor_id=user.id,
            actor_role=user.role,
            action="campaign.merge",
            entity_type="campaign",
            entity_id=str(id),
            before={"label": camp.label, "member_count": camp.member_count},
            after={"merged_into": str(target.id), "target_label": target.label},
        )
        session.add(audit)

        # Delete merged source campaign
        await session.delete(camp)
        await session.flush()

        st = (
            await session.get(ScamType, target.scam_type_id)
            if target.scam_type_id
            else None
        )
        return CampaignItem(
            id=target.id,
            label=target.label,
            scam_type_id=target.scam_type_id,
            scam_type_name=st.name_en if st else None,
            scam_type_name_bn=st.name_bn if st else None,
            member_count=target.member_count,
            count_7d=target.count_7d,
            prev_count_7d=target.prev_count_7d,
            is_surging=target.is_surging,
            first_seen_at=target.first_seen_at,
            last_seen_at=target.last_seen_at,
            updated_at=target.updated_at,
            sample_messages=[],
            shared_numbers=[],
            case_references=[],
        )

    if payload.label is not None:
        old_label = camp.label
        new_label = payload.label.strip()
        camp.label = new_label
        camp.updated_at = now

        # Record audit event
        audit = AuditEvent(
            actor_id=user.id,
            actor_role=user.role,
            action="campaign.rename",
            entity_type="campaign",
            entity_id=str(id),
            before={"label": old_label},
            after={"label": new_label},
        )
        session.add(audit)
        await session.flush()

    st = await session.get(ScamType, camp.scam_type_id) if camp.scam_type_id else None
    return CampaignItem(
        id=camp.id,
        label=camp.label,
        scam_type_id=camp.scam_type_id,
        scam_type_name=st.name_en if st else None,
        scam_type_name_bn=st.name_bn if st else None,
        member_count=camp.member_count,
        count_7d=camp.count_7d,
        prev_count_7d=camp.prev_count_7d,
        is_surging=camp.is_surging,
        first_seen_at=camp.first_seen_at,
        last_seen_at=camp.last_seen_at,
        updated_at=camp.updated_at,
        sample_messages=[],
        shared_numbers=[],
        case_references=[],
    )
