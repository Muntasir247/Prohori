"""Cases endpoints (Doc 02 Section 9, F14, S29).

GET /api/v1/cases (Partner & Reviewer)
GET /api/v1/cases/export.csv
"""

from __future__ import annotations

import csv
import io
from collections.abc import AsyncIterator
from datetime import UTC, date, datetime, time
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, Request, Response
from fastapi.responses import StreamingResponse
from sqlalchemy import desc, func, select

from app.api.deps import DbSession, get_optional_user, require_role
from app.errors import AppError
from app.models.api_key import ApiKey
from app.models.audit import AuditEvent
from app.models.base import utcnow
from app.models.check import Case, Check, CheckNumber, RiskyNumber, ScamType
from app.models.user import User
from app.schemas.cases import CaseListResponse, CaseSummary, ScamTypeSummary
from app.security.tokens import hash_token

router = APIRouter(prefix="/cases", tags=["cases"])
ReviewerUser = Annotated[User, Depends(require_role("reviewer", "admin"))]

DANGEROUS_FORMULA_PREFIXES = ("=", "+", "-", "@")


def escape_csv_cell(value: Any) -> str:
    """Escape cells beginning with =, +, -, or @ to neutralize formula injection."""
    if value is None:
        return ""
    val_str = str(value)
    if val_str and val_str[0] in DANGEROUS_FORMULA_PREFIXES:
        return f"'{val_str}"
    return val_str


async def resolve_cases_read_auth(
    request: Request,
    response: Response,
    session: DbSession,
) -> None:
    """Resolve caller auth: Reviewer/Admin session OR ApiKey with cases:read."""
    if getattr(request.state, "api_key", None):
        if "cases:read" in (request.state.api_key.scopes or []):
            return
        raise AppError("forbidden", status=403, message_key="errors.forbidden")

    auth_header = request.headers.get("authorization") or request.headers.get(
        "x-api-key"
    )
    if auth_header:
        raw_key = auth_header.removeprefix("Bearer ").strip()
        h = hash_token(raw_key)
        stmt = select(ApiKey).where(ApiKey.key_hash == h, ApiKey.revoked_at.is_(None))
        key_obj = (await session.execute(stmt)).scalar_one_or_none()
        if not key_obj:
            raise AppError(
                "unauthorized", status=401, message_key="errors.unauthorized"
            )
        if "cases:read" not in (key_obj.scopes or []):
            raise AppError("forbidden", status=403, message_key="errors.forbidden")
        key_obj.last_used_at = utcnow()
        return

    # Fallback to session
    user = await get_optional_user(request, response, session)
    if not user:
        raise AppError("unauthorized", status=401, message_key="errors.unauthorized")
    if user.role not in ("reviewer", "admin"):
        raise AppError("forbidden", status=403, message_key="errors.forbidden")


@router.get(
    "",
    response_model=CaseListResponse,
    summary="List fraud cases [Partner Endpoint — Simulated Data]",
    description=(
        "Partner and reviewer endpoint to query reported fraud cases. "
        "NOTICE: Simulated data only (simulated-v1). "
        "Auth: Reviewer session or API key with 'cases:read' scope."
    ),
    tags=["Partner", "cases"],
)
async def list_cases(
    request: Request,
    response: Response,
    session: DbSession,
    status: str | None = Query(None),
    level: str | None = Query(None),
    scam_type: str | None = Query(None),
    assignee: str | None = Query(None),
    from_date: str | None = Query(None, alias="from"),
    to_date: str | None = Query(None, alias="to"),
    q: str | None = Query(None),
    sort: str = Query("high_first"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> CaseListResponse:
    await resolve_cases_read_auth(request, response, session)

    base_query = (
        select(Case, Check, ScamType)
        .join(Check, Case.check_id == Check.id)
        .outerjoin(ScamType, Case.scam_type_id == ScamType.id)
    )

    if status and status != "all":
        base_query = base_query.where(Case.status == status)
    if level and level != "all":
        base_query = base_query.where(Check.final_level == level)
    if scam_type:
        if scam_type.isdigit():
            base_query = base_query.where(Case.scam_type_id == int(scam_type))
        else:
            base_query = base_query.where(ScamType.slug == scam_type)
    if assignee:
        base_query = base_query.where(Case.assigned_to == assignee)
    if from_date:
        try:
            fd = date.fromisoformat(from_date)
            base_query = base_query.where(
                Case.created_at >= datetime.combine(fd, time.min, tzinfo=UTC)
            )
        except ValueError:
            pass
    if to_date:
        try:
            td = date.fromisoformat(to_date)
            base_query = base_query.where(
                Case.created_at <= datetime.combine(td, time.max, tzinfo=UTC)
            )
        except ValueError:
            pass
    if q:
        base_query = base_query.where(
            (Case.reference.ilike(f"%{q}%")) | (Check.masked_text.ilike(f"%{q}%"))
        )

    # Count total
    count_query = select(func.count()).select_from(base_query.subquery())
    total = (await session.execute(count_query)).scalar_one() or 0

    # Sorting
    if sort == "oldest":
        base_query = base_query.order_by(Case.created_at.asc())
    elif sort == "newest":
        base_query = base_query.order_by(desc(Case.created_at))
    else:  # high_first (Doc 02 Section 9: sort High first then oldest)
        from sqlalchemy import case as sql_case

        level_order = sql_case(
            (Check.final_level == "High", 1),
            (Check.final_level == "Medium", 2),
            else_=3,
        )
        base_query = base_query.order_by(level_order, Case.created_at.asc())

    paged_query = base_query.offset((page - 1) * page_size).limit(page_size)
    rows = (await session.execute(paged_query)).all()

    items = []
    for case, check, st in rows:
        st_summary = (
            ScamTypeSummary(
                id=st.id,
                slug=st.slug,
                name_en=st.name_en,
                name_bn=st.name_bn,
            )
            if st
            else None
        )
        items.append(
            CaseSummary(
                id=case.id,
                reference=case.reference,
                status=case.status,
                check_id=case.check_id,
                risk_level=check.final_level,
                scam_type=st_summary,
                reporter_note=case.reporter_note,
                masked_text=check.masked_text,
                created_at=case.created_at,
                decided_at=case.decided_at,
                assigned_to=case.assigned_to,
                version=case.version,
            )
        )

    return CaseListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/export.csv")
async def export_cases_csv(
    user: ReviewerUser,
    session: DbSession,
    from_date: str = Query(..., alias="from"),
    to_date: str = Query(..., alias="to"),
    status: str | None = Query(None),
    scam_type: str | None = Query(None),
) -> StreamingResponse:
    """Stream masked cases as UTF-8 CSV with BOM and CSV injection defense."""
    try:
        start_d = date.fromisoformat(from_date)
        end_d = date.fromisoformat(to_date)
    except ValueError:
        raise AppError(
            "validation_failed", status=422, message_key="errors.invalid_date"
        ) from None

    if start_d > end_d:
        raise AppError(
            "validation_failed", status=422, message_key="errors.invalid_date_range"
        )

    if (end_d - start_d).days > 366:
        raise AppError(
            "range_too_large",
            status=422,
            message_key="errors.date_range_exceeds_maximum",
        )

    # Record audit event before streaming
    audit = AuditEvent(
        actor_id=user.id,
        actor_role=user.role,
        action="cases.export",
        entity_type="case",
        entity_id="export",
        before=None,
        after={
            "from": start_d.isoformat(),
            "to": end_d.isoformat(),
            "status": status,
            "scam_type": scam_type,
        },
    )
    session.add(audit)
    await session.flush()

    range_start_dt = datetime.combine(start_d, time.min, tzinfo=UTC)
    range_end_dt = datetime.combine(end_d, time.max, tzinfo=UTC)

    # Build query
    query = (
        select(Case, Check, ScamType)
        .join(Check, Case.check_id == Check.id)
        .outerjoin(ScamType, Case.scam_type_id == ScamType.id)
        .where(Case.created_at >= range_start_dt, Case.created_at <= range_end_dt)
        .order_by(desc(Case.created_at))
    )

    if status and status != "all":
        query = query.where(Case.status == status)

    if scam_type:
        if scam_type.isdigit():
            query = query.where(Case.scam_type_id == int(scam_type))
        else:
            query = query.where(ScamType.slug == scam_type)

    results = (await session.execute(query)).all()

    # Pre-fetch phone numbers for checks in results
    check_ids = [check.id for case, check, st in results]
    numbers_map: dict[str, dict[str, str]] = {}
    if check_ids:
        num_query = (
            select(CheckNumber.check_id, CheckNumber.role, RiskyNumber.masked_display)
            .join(RiskyNumber, CheckNumber.number_id == RiskyNumber.id)
            .where(CheckNumber.check_id.in_(check_ids))
        )
        num_rows = (await session.execute(num_query)).all()
        for cid, role, m_num in num_rows:
            cid_str = str(cid)
            numbers_map.setdefault(cid_str, {})[role] = m_num

    async def csv_generator() -> AsyncIterator[bytes]:
        # UTF-8 with BOM so Excel correctly recognizes Bengali characters
        yield b"\xef\xbb\xbf"

        output = io.StringIO()
        writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)

        # Header row
        headers = [
            "Reference",
            "Created At",
            "Status",
            "Risk Level",
            "Scam Type",
            "Masked Sender",
            "Masked Recipient",
            "Masked Message",
            "Reporter Note",
            "Decision Reason",
            "Decided At",
        ]
        writer.writerow(headers)
        yield output.getvalue().encode("utf-8")
        output.seek(0)
        output.truncate(0)

        # Data rows
        for case, check, st in results:
            cid_str = str(check.id)
            nums = numbers_map.get(cid_str, {})
            sender_num = nums.get("sender", "")
            recipient_num = nums.get("recipient", "")

            st_label = st.name_en if st else ""
            created_str = case.created_at.isoformat() if case.created_at else ""
            decided_str = case.decided_at.isoformat() if case.decided_at else ""

            row = [
                escape_csv_cell(case.reference),
                escape_csv_cell(created_str),
                escape_csv_cell(case.status),
                escape_csv_cell(check.final_level or ""),
                escape_csv_cell(st_label),
                escape_csv_cell(sender_num),
                escape_csv_cell(recipient_num),
                escape_csv_cell(check.masked_text or ""),
                escape_csv_cell(case.reporter_note or ""),
                escape_csv_cell(case.decision_reason or ""),
                escape_csv_cell(decided_str),
            ]
            writer.writerow(row)
            yield output.getvalue().encode("utf-8")
            output.seek(0)
            output.truncate(0)

    filename = f"prohori-cases-{start_d.isoformat()}-to-{end_d.isoformat()}.csv"
    return StreamingResponse(
        csv_generator(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
