"""Check endpoints (Doc 02 Section 9).

POST /check-message
POST /check-payment
GET /checks
GET /checks/{id}
DELETE /checks/{id}
POST /checks/{id}/report
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import (
    CurrentUser,
    DbSession,
    enforce_csrf,
    get_guest_hash,
    get_optional_user,
)
from app.errors import AppError
from app.models.api_key import ApiKey
from app.models.check import Check
from app.models.user import User
from app.schemas.checks import (
    CheckHistoryResponse,
    CheckMessageRequest,
    CheckPaymentRequest,
    CheckResultResponse,
    PauseAckRequest,
    PauseAckResponse,
    ReportCheckRequest,
    ReportCheckResponse,
)
from app.security.tokens import hash_token
from app.services import checks as check_service
from app.services import rate_limit

router = APIRouter(tags=["checks"])


async def resolve_check_auth(
    request: Request,
    response: Response,
    session: DbSession,
) -> tuple[User | None, str | None, UUID | None]:
    """Resolve caller identity: API Key (with checks:write), User, or Guest."""
    if getattr(request.state, "api_key", None):
        key_obj = request.state.api_key
        if "checks:write" not in (key_obj.scopes or []):
            raise AppError("forbidden", status=403, message_key="errors.forbidden")
        return None, None, key_obj.id

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
        if "checks:write" not in (key_obj.scopes or []):
            raise AppError("forbidden", status=403, message_key="errors.forbidden")
        key_obj.last_used_at = check_service._now()
        return None, None, key_obj.id

    # Not an API key; check user session or guest cookie
    user = await get_optional_user(request, response, session)
    if user:
        return user, None, None

    # Guest visitor
    guest_hash = await get_guest_hash(request, response)
    return None, guest_hash, None


async def enforce_check_rate_limit(
    session: AsyncSession,
    caller_id: str,
) -> None:
    # 10 per minute
    r_min = await rate_limit.hit(
        session, f"check:min:{caller_id}", limit=10, window_seconds=60
    )
    if not r_min.allowed:
        raise AppError(
            "rate_limited",
            status=429,
            retry_after=r_min.retry_after,
            message_key="errors.rate_limited",
        )
    # 60 per day
    r_day = await rate_limit.hit(
        session, f"check:day:{caller_id}", limit=60, window_seconds=86400
    )
    if not r_day.allowed:
        raise AppError(
            "rate_limited",
            status=429,
            retry_after=r_day.retry_after,
            message_key="errors.rate_limited",
        )


@router.post(
    "/check-message",
    response_model=CheckResultResponse,
    dependencies=[Depends(enforce_csrf)],
    summary="Check suspicious message [Partner Endpoint — Simulated Data]",
    description=(
        "Partner and guest endpoint to check a suspicious message for fraud. "
        "NOTICE: Simulated data only (simulated-v1). "
        "Auth: Guest or API key with 'checks:write' scope."
    ),
    tags=["Partner", "checks"],
)
async def check_message(
    body: CheckMessageRequest,
    request: Request,
    response: Response,
    session: DbSession,
) -> CheckResultResponse:
    user, guest_hash, api_key_id = await resolve_check_auth(request, response, session)
    caller_id = str(user.id) if user else (guest_hash or str(api_key_id))
    if not api_key_id:
        await enforce_check_rate_limit(session, caller_id)

    return await check_service.run_message_check(
        session,
        text=body.text,
        claimed_sender=body.claimed_sender,
        language_hint=body.language_hint,
        user_id=user.id if user else None,
        guest_hash=guest_hash,
        api_key_id=api_key_id,
    )


@router.post(
    "/check-payment",
    response_model=CheckResultResponse,
    dependencies=[Depends(enforce_csrf)],
    summary="Check suspicious payment request [Partner Endpoint — Simulated Data]",
    description=(
        "Partner and guest endpoint to assess payment risk before sending money. "
        "NOTICE: Simulated data only (simulated-v1). "
        "Auth: Guest or API key with 'checks:write' scope."
    ),
    tags=["Partner", "checks"],
)
async def check_payment(
    body: CheckPaymentRequest,
    request: Request,
    response: Response,
    session: DbSession,
) -> CheckResultResponse:
    user, guest_hash, api_key_id = await resolve_check_auth(request, response, session)
    caller_id = str(user.id) if user else (guest_hash or str(api_key_id))
    if not api_key_id:
        await enforce_check_rate_limit(session, caller_id)

    return await check_service.run_payment_check(
        session,
        req=body,
        user_id=user.id if user else None,
        guest_hash=guest_hash,
        api_key_id=api_key_id,
    )


@router.get("/checks", response_model=CheckHistoryResponse)
async def list_checks(
    user: CurrentUser,
    session: DbSession,
    level: str | None = Query(None, pattern="^(Low|Medium|High)$"),
    kind: str | None = Query(None, pattern="^(message|payment)$"),
    limit: int = Query(20, ge=1, le=100),
) -> CheckHistoryResponse:
    return await check_service.list_user_checks(
        session,
        user.id,
        level=level,
        kind=kind,
        limit=limit,
    )


@router.get("/checks/{id}", response_model=CheckResultResponse)
async def get_check(
    id: UUID,
    request: Request,
    response: Response,
    session: DbSession,
) -> CheckResultResponse:
    user = await get_optional_user(request, response, session)
    guest_hash = await get_guest_hash(request, response)

    check = await check_service.get_check_by_id(
        session,
        id,
        user=user,
        guest_hash=guest_hash,
    )
    if not check:
        raise AppError("not_found", status=404, message_key="errors.not_found")
    return check


@router.delete(
    "/checks/{id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(enforce_csrf)],
)
async def delete_check(
    id: UUID,
    user: CurrentUser,
    session: DbSession,
    response: Response,
) -> Response:
    await check_service.delete_user_check(session, id, user.id)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.post(
    "/checks/{id}/report",
    response_model=ReportCheckResponse,
    dependencies=[Depends(enforce_csrf)],
)
async def report_check(
    id: UUID,
    body: ReportCheckRequest,
    request: Request,
    response: Response,
    session: DbSession,
) -> ReportCheckResponse:
    user = await get_optional_user(request, response, session)
    guest_hash = await get_guest_hash(request, response)

    ref = await check_service.report_check(
        session,
        id,
        consent=body.consent,
        note=body.note,
        user=user,
        guest_hash=guest_hash,
    )
    return ReportCheckResponse(reference=ref)


@router.post(
    "/checks/{id}/pause-ack",
    response_model=PauseAckResponse,
    dependencies=[Depends(enforce_csrf)],
)
async def acknowledge_pause(
    id: UUID,
    body: PauseAckRequest,
    request: Request,
    response: Response,
    session: DbSession,
) -> PauseAckResponse:
    """Record whether Pressure Pause was finished or skipped (Doc 02 Feature F32)."""
    user = await get_optional_user(request, response, session)
    guest_hash = await get_guest_hash(request, response)

    check = await session.get(Check, id)
    if not check or check.deleted_at is not None:
        raise AppError("not_found", status=404, message_key="errors.not_found")

    is_reviewer = user and user.role in ("reviewer", "admin")
    is_owner = (user and check.user_id == user.id) or (
        guest_hash and check.guest_hash == guest_hash
    )
    if not (is_owner or is_reviewer):
        raise AppError("forbidden", status=403, message_key="errors.forbidden")

    check.pause_outcome = body.outcome
    await session.flush()
    return PauseAckResponse(ok=True, outcome=body.outcome)
