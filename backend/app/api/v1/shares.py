"""Share endpoints for 'Ask someone you trust' (Doc 02 Feature F33, S21).

POST /checks/{id}/share
DELETE /checks/{id}/share
GET /shares/{token}
"""

from __future__ import annotations

import secrets
from datetime import UTC, datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy import select

from app.api.deps import (
    DbSession,
    enforce_csrf,
    get_guest_hash,
    get_optional_user,
)
from app.errors import AppError
from app.models.base import utcnow
from app.models.check import Check, ScamType, Share
from app.models.knowledge import SafeAction
from app.schemas.checks import (
    CreateShareResponse,
    SafeActionItem,
    SharedResultResponse,
)
from app.security.tokens import hash_token

router = APIRouter(tags=["shares"])


def _aware(dt: datetime) -> datetime:
    """Ensure naive datetimes from SQLite are treated as UTC."""
    return dt if dt.tzinfo else dt.replace(tzinfo=UTC)


@router.post(
    "/checks/{id}/share",
    response_model=CreateShareResponse,
    dependencies=[Depends(enforce_csrf)],
)
async def create_share_link(
    id: UUID,
    request: Request,
    response: Response,
    session: DbSession,
) -> CreateShareResponse:
    """Generate a revocable 24-hour masked share link (Doc 02 Feature F33)."""
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

    now = utcnow()

    # Revoke any prior active shares for this check
    prior_shares = (
        await session.scalars(
            select(Share).where(
                Share.check_id == id,
                Share.revoked_at.is_(None),
                Share.expires_at > now,
            )
        )
    ).all()
    for s in prior_shares:
        s.revoked_at = now

    # Generate 256-bit raw random token
    raw_token = secrets.token_urlsafe(32)
    token_hashed = hash_token(raw_token)
    expires_at = now + timedelta(hours=24)

    share = Share(
        check_id=id,
        token_hash=token_hashed,
        expires_at=expires_at,
        revoked_at=None,
        created_at=now,
    )
    session.add(share)
    await session.flush()

    return CreateShareResponse(
        share_url=f"/s/{raw_token}",
        token=raw_token,
        expires_at=expires_at,
    )


@router.delete(
    "/checks/{id}/share",
    status_code=204,
    response_class=Response,
    dependencies=[Depends(enforce_csrf)],
)
async def revoke_share_link(
    id: UUID,
    request: Request,
    response: Response,
    session: DbSession,
) -> Response:
    """Revoke all active share links for a check (Doc 02 Feature F33)."""
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

    now = utcnow()
    active_shares = (
        await session.scalars(
            select(Share).where(
                Share.check_id == id,
                Share.revoked_at.is_(None),
                Share.expires_at > now,
            )
        )
    ).all()
    for s in active_shares:
        s.revoked_at = now

    await session.flush()
    return Response(status_code=204)


@router.get("/shares/{token}", response_model=SharedResultResponse)
async def get_shared_result(
    token: str,
    response: Response,
    session: DbSession,
) -> SharedResultResponse:
    """Return public masked result. Invalid, expired, or revoked tokens return 410."""
    now = utcnow()
    token_hashed = hash_token(token)

    share = (
        await session.scalars(select(Share).where(Share.token_hash == token_hashed))
    ).first()

    # Per Doc 02: "Invalid, revoked and expired tokens give the same 410 response"
    if not share or share.revoked_at is not None or _aware(share.expires_at) < now:
        raise AppError(
            "share_expired_or_invalid",
            status=410,
            message_key="errors.share_expired_or_invalid",
        )

    check = await session.get(Check, share.check_id)
    if not check or check.deleted_at is not None:
        raise AppError(
            "share_expired_or_invalid",
            status=410,
            message_key="errors.share_expired_or_invalid",
        )

    # Search engines must not index shared family checks
    response.headers["X-Robots-Tag"] = "noindex, nofollow"

    # Scam type name
    st_name: str | None = None
    if check.scam_type_id:
        st = await session.get(ScamType, check.scam_type_id)
        if st:
            st_name = st.name_en

    # Safe actions (generic before_payment actions)
    action_rows = (
        await session.scalars(
            select(SafeAction).where(
                SafeAction.is_active.is_(True),
                SafeAction.context.in_(("before_payment", "both")),
            )
        )
    ).all()

    safe_action_items = [
        SafeActionItem(
            id=a.id,
            label=a.label_en,
            body=a.body_en,
            phone=a.phone,
        )
        for a in action_rows[:3]
    ]

    return SharedResultResponse(
        level=check.final_level,
        masked_text=check.masked_text,
        reasons=check.reasons or [],
        scam_type=st_name,
        safe_actions=safe_action_items,
        expires_at=share.expires_at,
    )
