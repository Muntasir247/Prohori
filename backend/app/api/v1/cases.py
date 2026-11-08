"""Cases endpoints, including CSV streaming export (Doc 02 Section 9, F14, S29).

GET /api/v1/cases/export.csv
"""

from __future__ import annotations

import csv
import io
from collections.abc import AsyncIterator
from datetime import UTC, date, datetime, time
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import desc, select

from app.api.deps import DbSession, require_role
from app.errors import AppError
from app.models.audit import AuditEvent
from app.models.check import Case, Check, CheckNumber, RiskyNumber, ScamType
from app.models.user import User

router = APIRouter(prefix="/cases", tags=["cases"])
ReviewerUser = Annotated[User, Depends(require_role("reviewer", "admin"))]

DANGEROUS_FORMULA_PREFIXES = ("=", "+", "-", "@")


def escape_csv_cell(value: Any) -> str:
    """Escape cells beginning with =, +, -, or @ to neutralize formula injection."""
    if value is None:
        return ""
    val_str = str(value)
    # Check if first character is a dangerous formula character
    if val_str and val_str[0] in DANGEROUS_FORMULA_PREFIXES:
        return f"'{val_str}"
    return val_str


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
