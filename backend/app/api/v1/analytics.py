"""Reviewer analytics and repeat numbers endpoints (Doc 02, F12, F13, F28, F36).

GET /api/v1/analytics/overview
GET /api/v1/analytics/numbers
PATCH /api/v1/analytics/numbers/{id}
"""

from __future__ import annotations

import statistics
from datetime import UTC, date, datetime, time, timedelta
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc, func, select

from app.api.deps import DbSession, require_role
from app.errors import AppError
from app.models.audit import AuditEvent
from app.models.base import utcnow
from app.models.check import (
    Campaign,
    Case,
    Check,
    CheckNumber,
    DailyAggregate,
    RiskyNumber,
    ScamType,
)
from app.models.user import User
from app.schemas.analytics import (
    AnalyticsOverviewResponse,
    CasesByRiskItem,
    KPIOverview,
    RepeatNumberItem,
    RepeatNumberSeriesItem,
    RepeatNumbersResponse,
    ReviewerDecisionSeriesItem,
    SurgingCampaignRadar,
    TopScamTypeItem,
    UpdateNumberStatusRequest,
)

router = APIRouter(prefix="/analytics", tags=["analytics"])
ReviewerUser = Annotated[User, Depends(require_role("reviewer", "admin"))]


@router.get("/overview", response_model=AnalyticsOverviewResponse)
async def get_analytics_overview(
    user: ReviewerUser,
    session: DbSession,
    from_date: str | None = Query(None, alias="from"),
    to_date: str | None = Query(None, alias="to"),
    days: int | None = Query(None),
    scam_type: str | None = Query(None),
    risk_level: str | None = Query(None),
) -> AnalyticsOverviewResponse:
    """Return dashboard KPIs and series for reviewer analytics.

    Combines daily_aggregates for past dates with live rows for today.
    """
    now = utcnow()
    today_date = now.date()
    today_start = datetime(now.year, now.month, now.day, tzinfo=UTC)

    # Resolve date boundaries
    end_d: date = today_date
    if to_date:
        try:
            end_d = date.fromisoformat(to_date)
        except ValueError:
            raise AppError(
                "validation_failed", status=422, message_key="errors.invalid_date"
            ) from None

    if from_date:
        try:
            start_d = date.fromisoformat(from_date)
        except ValueError:
            raise AppError(
                "validation_failed", status=422, message_key="errors.invalid_date"
            ) from None
    elif days:
        start_d = end_d - timedelta(days=max(days - 1, 0))
    else:
        # Default to 30 days
        start_d = end_d - timedelta(days=29)

    if start_d > end_d:
        raise AppError(
            "validation_failed", status=422, message_key="errors.invalid_date_range"
        )

    if (end_d - start_d).days > 366:
        raise AppError(
            "range_too_large", status=422, message_key="errors.range_too_large"
        )

    # Resolve scam_type filter to id if provided
    scam_type_id_filter: int | None = None
    if scam_type:
        if scam_type.isdigit():
            scam_type_id_filter = int(scam_type)
        else:
            st_match = (
                await session.scalars(
                    select(ScamType).where(ScamType.slug == scam_type)
                )
            ).first()
            if st_match:
                scam_type_id_filter = st_match.id

    # 1. KPIs
    # Open cases (status in new, in_review)
    open_cases_stmt = select(func.count(Case.id)).where(
        Case.status.in_(["new", "in_review"])
    )
    open_cases = (await session.execute(open_cases_stmt)).scalar() or 0

    # High today (checks created today with final_level == 'High')
    high_today_stmt = select(func.count(Check.id)).where(
        Check.created_at >= today_start, Check.final_level == "High"
    )
    high_today = (await session.execute(high_today_stmt)).scalar() or 0

    # Decided cases in date range for median decision time and agreement
    range_start_dt = datetime.combine(start_d, time.min, tzinfo=UTC)
    range_end_dt = datetime.combine(end_d, time.max, tzinfo=UTC)

    decided_stmt = (
        select(Case.created_at, Case.decided_at, Case.status, Check.final_level)
        .join(Check, Case.check_id == Check.id)
        .where(
            Case.decided_at.isnot(None),
            Case.created_at >= range_start_dt,
            Case.created_at <= range_end_dt,
        )
    )
    if scam_type_id_filter is not None:
        decided_stmt = decided_stmt.where(Case.scam_type_id == scam_type_id_filter)
    if risk_level:
        decided_stmt = decided_stmt.where(Check.final_level == risk_level)

    decided_rows = (await session.execute(decided_stmt)).all()

    decision_durations: list[float] = []
    agreed_count = 0
    total_decided = len(decided_rows)

    for row in decided_rows:
        c_at, d_at, status, f_level = row
        if d_at and c_at:
            duration = (d_at - c_at).total_seconds()
            if duration >= 0:
                decision_durations.append(duration)
        # Agreement: Prohori High & Reviewer confirmed_scam,
        # OR Prohori != High & Reviewer not_a_scam/closed
        if (f_level == "High" and status == "confirmed_scam") or (
            f_level != "High"
            and status in ("not_a_scam", "closed", "close_without_action")
        ):
            agreed_count += 1

    median_duration = (
        float(statistics.median(decision_durations)) if decision_durations else None
    )
    reviewer_agreement = (
        float(agreed_count / total_decided) if total_decided > 0 else 1.0
    )

    kpis = KPIOverview(
        open_cases=open_cases,
        high_today=high_today,
        median_time_to_decision=median_duration,
        reviewer_agreement=round(reviewer_agreement, 3),
    )

    # 2. Date series maps initialized for continuous timeline
    num_days = (end_d - start_d).days + 1
    date_list = [start_d + timedelta(days=i) for i in range(num_days)]
    date_strs = [d.isoformat() for d in date_list]

    cases_by_risk_map = {ds: {"High": 0, "Medium": 0, "Low": 0} for ds in date_strs}
    repeat_numbers_map = {ds: 0 for ds in date_strs}
    decisions_map = {
        ds: {
            "confirmed_scam": 0,
            "not_a_scam": 0,
            "needs_escalation": 0,
            "closed": 0,
        }
        for ds in date_strs
    }

    # Query daily aggregates for historical days in range (day < today)
    agg_query = select(DailyAggregate).where(
        DailyAggregate.day >= start_d,
        DailyAggregate.day < today_date,
        DailyAggregate.day <= end_d,
    )
    if risk_level:
        agg_query = agg_query.where(DailyAggregate.risk_level == risk_level)
    if scam_type_id_filter is not None:
        agg_query = agg_query.where(DailyAggregate.scam_type_id == scam_type_id_filter)

    agg_rows = (await session.scalars(agg_query)).all()
    days_with_agg = {r.day for r in agg_rows}

    for r in agg_rows:
        ds = r.day.isoformat()
        if ds in cases_by_risk_map and r.risk_level in cases_by_risk_map[ds]:
            cases_by_risk_map[ds][r.risk_level] += r.case_count

    # For days without aggregates (including today, or past days missing from agg table)
    # Query live cases and checks!
    missing_days = [d for d in date_list if d not in days_with_agg or d == today_date]
    if missing_days:
        min_m_dt = datetime.combine(min(missing_days), time.min, tzinfo=UTC)
        max_m_dt = datetime.combine(max(missing_days), time.max, tzinfo=UTC)

        live_cases_stmt = (
            select(Case.created_at, Check.final_level, Case.scam_type_id)
            .join(Check, Case.check_id == Check.id)
            .where(
                Case.created_at >= min_m_dt,
                Case.created_at <= max_m_dt,
                Check.final_level.isnot(None),
            )
        )
        if risk_level:
            live_cases_stmt = live_cases_stmt.where(Check.final_level == risk_level)
        if scam_type_id_filter is not None:
            live_cases_stmt = live_cases_stmt.where(
                Case.scam_type_id == scam_type_id_filter
            )

        live_cases = (await session.execute(live_cases_stmt)).all()
        for lc in live_cases:
            c_dt = lc[0]
            lvl = lc[1]
            c_day = c_dt.date() if isinstance(c_dt, datetime) else c_dt
            if c_day in missing_days:
                ds = c_day.isoformat()
                if ds in cases_by_risk_map and lvl in cases_by_risk_map[ds]:
                    cases_by_risk_map[ds][lvl] += 1

    # 3. Reviewer decisions series (live rows over date range)
    case_decisions_stmt = select(Case.decided_at, Case.status).where(
        Case.decided_at.isnot(None),
        Case.decided_at >= range_start_dt,
        Case.decided_at <= range_end_dt,
    )
    if scam_type_id_filter is not None:
        case_decisions_stmt = case_decisions_stmt.where(
            Case.scam_type_id == scam_type_id_filter
        )

    case_decisions = (await session.execute(case_decisions_stmt)).all()
    for cd in case_decisions:
        d_at = cd[0]
        st = cd[1]
        d_day = d_at.date() if isinstance(d_at, datetime) else d_at
        ds = d_day.isoformat()
        if ds in decisions_map:
            if st in ("close_without_action", "closed"):
                decisions_map[ds]["closed"] += 1
            elif st in decisions_map[ds]:
                decisions_map[ds][st] += 1

    # 4. Repeat numbers over time (check_count > 1 or report_count > 0)
    repeat_numbers_stmt = (
        select(Check.created_at, func.count(func.distinct(CheckNumber.number_id)))
        .join(CheckNumber, Check.id == CheckNumber.check_id)
        .join(RiskyNumber, CheckNumber.number_id == RiskyNumber.id)
        .where(
            Check.created_at >= range_start_dt,
            Check.created_at <= range_end_dt,
            (RiskyNumber.check_count > 1) | (RiskyNumber.report_count > 0),
        )
        .group_by(Check.created_at)
    )
    repeat_rows = (await session.execute(repeat_numbers_stmt)).all()
    for r_dt, cnt in repeat_rows:
        r_day = r_dt.date() if isinstance(r_dt, datetime) else r_dt
        ds = r_day.isoformat()
        if ds in repeat_numbers_map:
            repeat_numbers_map[ds] += cnt

    # 5. Top scam types (5 plus Other)
    all_scam_types = {
        st.id: st for st in (await session.scalars(select(ScamType))).all()
    }
    scam_counts_stmt = (
        select(Case.scam_type_id, func.count(Case.id))
        .where(Case.created_at >= range_start_dt, Case.created_at <= range_end_dt)
        .group_by(Case.scam_type_id)
        .order_by(desc(func.count(Case.id)))
    )
    scam_counts = (await session.execute(scam_counts_stmt)).all()

    top_types: list[TopScamTypeItem] = []
    other_count = 0
    for idx, (st_id, cnt) in enumerate(scam_counts):
        if idx < 5 and st_id and st_id in all_scam_types:
            st = all_scam_types[st_id]
            top_types.append(
                TopScamTypeItem(
                    scam_type_id=st.id,
                    slug=st.slug,
                    name=st.name_en,
                    name_bn=st.name_bn,
                    count=cnt,
                )
            )
        else:
            other_count += cnt

    if other_count > 0 or not top_types:
        top_types.append(
            TopScamTypeItem(
                scam_type_id=None,
                slug="other",
                name="Other",
                name_bn="অন্যান্য",
                count=other_count,
            )
        )

    # 6. Campaign Radar (F36: Surging campaigns)
    surging_campaigns_db = (
        await session.scalars(
            select(Campaign)
            .where(Campaign.is_surging.is_(True))
            .order_by(desc(Campaign.count_7d))
        )
    ).all()

    radar_items: list[SurgingCampaignRadar] = []
    for camp in surging_campaigns_db:
        st_name = (
            all_scam_types[camp.scam_type_id].name_en
            if camp.scam_type_id in all_scam_types
            else None
        )
        growth = (
            (camp.count_7d / camp.prev_count_7d)
            if camp.prev_count_7d > 0
            else float(camp.count_7d)
        )
        radar_items.append(
            SurgingCampaignRadar(
                id=camp.id,
                label=camp.label,
                scam_type=st_name,
                count_7d=camp.count_7d,
                prev_count_7d=camp.prev_count_7d,
                growth_ratio=round(growth, 2),
            )
        )

    cases_by_risk_series = [
        CasesByRiskItem(
            date=ds,
            High=cases_by_risk_map[ds]["High"],
            Medium=cases_by_risk_map[ds]["Medium"],
            Low=cases_by_risk_map[ds]["Low"],
        )
        for ds in date_strs
    ]

    repeat_numbers_series = [
        RepeatNumberSeriesItem(date=ds, count=repeat_numbers_map[ds])
        for ds in date_strs
    ]

    decisions_series = [
        ReviewerDecisionSeriesItem(
            date=ds,
            confirmed_scam=decisions_map[ds]["confirmed_scam"],
            not_a_scam=decisions_map[ds]["not_a_scam"],
            needs_escalation=decisions_map[ds]["needs_escalation"],
            closed=decisions_map[ds]["closed"],
        )
        for ds in date_strs
    ]

    return AnalyticsOverviewResponse(
        kpis=kpis,
        cases_by_risk=cases_by_risk_series,
        top_scam_types=top_types,
        repeat_numbers=repeat_numbers_series,
        reviewer_decisions=decisions_series,
        surging_campaigns=radar_items,
        simulated=True,
    )


@router.get("/numbers", response_model=RepeatNumbersResponse)
async def get_repeat_numbers(
    user: ReviewerUser,
    session: DbSession,
    status: str | None = Query(None),
    min_reports: int = Query(0, ge=0),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    q: str | None = Query(None),
) -> RepeatNumbersResponse:
    """List repeat and risky numbers with pagination, filters, and sparkline history."""
    query = select(RiskyNumber)

    if status and status != "all":
        query = query.where(RiskyNumber.status == status)

    if min_reports > 0:
        query = query.where(RiskyNumber.report_count >= min_reports)

    if q and q.strip():
        term = f"%{q.strip()}%"
        query = query.where(RiskyNumber.masked_display.ilike(term))

    count_stmt = select(func.count()).select_from(query.subquery())
    total = (await session.execute(count_stmt)).scalar() or 0

    query = (
        query.order_by(desc(RiskyNumber.report_count), desc(RiskyNumber.check_count))
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    rows = (await session.scalars(query)).all()

    # Build 30-day sparkline history and linked cases for each number
    now = utcnow()
    d30_ago = now - timedelta(days=30)

    items: list[RepeatNumberItem] = []
    for r in rows:
        high_share = (r.high_count / r.check_count) if r.check_count > 0 else 0.0

        # Query checks linked to this number in last 30 days
        spark_stmt = (
            select(func.date(Check.created_at), func.count(Check.id))
            .select_from(CheckNumber)
            .join(Check, CheckNumber.check_id == Check.id)
            .where(
                CheckNumber.number_id == r.id,
                Check.created_at >= d30_ago,
            )
            .group_by(func.date(Check.created_at))
        )
        spark_rows = (await session.execute(spark_stmt)).all()
        spark_dict = {str(d): c for d, c in spark_rows}

        history_30d = []
        for i in range(30):
            day_iso = (d30_ago + timedelta(days=i)).date().isoformat()
            history_30d.append({"date": day_iso, "count": spark_dict.get(day_iso, 0)})

        # Linked cases count
        case_cnt_stmt = (
            select(func.count(func.distinct(Case.id)))
            .select_from(Case)
            .join(CheckNumber, Case.check_id == CheckNumber.check_id)
            .where(CheckNumber.number_id == r.id)
        )
        linked_cases = (await session.execute(case_cnt_stmt)).scalar() or 0

        items.append(
            RepeatNumberItem(
                id=r.id,
                masked_display=r.masked_display,
                check_count=r.check_count,
                report_count=r.report_count,
                high_count=r.high_count,
                high_share=round(high_share, 3),
                status=r.status,
                first_seen_at=r.first_seen_at,
                last_seen_at=r.last_seen_at,
                history_30d=history_30d,
                linked_cases_count=linked_cases,
            )
        )

    return RepeatNumbersResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.patch("/numbers/{id}", response_model=RepeatNumberItem)
async def update_number_status(
    id: UUID,
    payload: UpdateNumberStatusRequest,
    user: ReviewerUser,
    session: DbSession,
) -> RepeatNumberItem:
    """Update risky number status (watch/confirmed_risky/cleared).

    Requires reason and logs to audit.
    """
    num = await session.get(RiskyNumber, id)
    if not num:
        raise AppError("not_found", status=404, message_key="errors.not_found")

    old_status = num.status
    new_status = payload.status

    num.status = new_status

    # Record audit event
    audit = AuditEvent(
        actor_id=user.id,
        actor_role=user.role,
        action="risky_number.status_change",
        entity_type="risky_number",
        entity_id=str(num.id),
        before={"status": old_status},
        after={"status": new_status, "reason": payload.reason},
    )
    session.add(audit)
    await session.flush()

    high_share = (num.high_count / num.check_count) if num.check_count > 0 else 0.0
    return RepeatNumberItem(
        id=num.id,
        masked_display=num.masked_display,
        check_count=num.check_count,
        report_count=num.report_count,
        high_count=num.high_count,
        high_share=round(high_share, 3),
        status=num.status,
        first_seen_at=num.first_seen_at,
        last_seen_at=num.last_seen_at,
        history_30d=[],
        linked_cases_count=num.report_count,
    )
