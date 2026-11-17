"""In-app notification endpoints (Doc 02 Section 9, F22, S23).

GET /api/v1/notifications
POST /api/v1/notifications/read
"""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import desc, func, select, update

from app.api.deps import CurrentUser, DbSession, enforce_csrf
from app.errors import AppError
from app.models.base import utcnow
from app.models.notification import Notification
from app.schemas.notifications import (
    NotificationListResponse,
    NotificationOut,
    NotificationReadIn,
)

router = APIRouter(
    prefix="/notifications",
    tags=["notifications"],
    dependencies=[Depends(enforce_csrf)],
)


@router.get("", response_model=NotificationListResponse)
async def list_notifications(
    user: CurrentUser,
    session: DbSession,
    unread: bool = Query(False),
    cursor: str | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
) -> NotificationListResponse:
    """Return paged in-app notifications for the signed-in user."""
    stmt = select(Notification).where(Notification.user_id == user.id)
    if unread:
        stmt = stmt.where(Notification.read_at.is_(None))
    if cursor:
        try:
            cursor_dt = datetime.fromisoformat(cursor)
            stmt = stmt.where(Notification.created_at < cursor_dt)
        except ValueError:
            raise AppError(
                "validation_failed", status=422, message_key="errors.invalid_cursor"
            ) from None

    stmt = stmt.order_by(desc(Notification.created_at)).limit(limit + 1)
    rows = list((await session.execute(stmt)).scalars().all())

    has_more = len(rows) > limit
    page_rows = rows[:limit]
    next_cursor = (
        page_rows[-1].created_at.isoformat() if has_more and page_rows else None
    )

    unread_stmt = select(func.count(Notification.id)).where(
        Notification.user_id == user.id,
        Notification.read_at.is_(None),
    )
    unread_count = (await session.execute(unread_stmt)).scalar_one() or 0

    return NotificationListResponse(
        items=[
            NotificationOut(
                id=n.id,
                type=n.type,
                payload=n.payload or {},
                read_at=n.read_at,
                created_at=n.created_at,
            )
            for n in page_rows
        ],
        unread_count=unread_count,
        next_cursor=next_cursor,
    )


@router.post("/read", status_code=204)
async def mark_notifications_read(
    body: NotificationReadIn,
    user: CurrentUser,
    session: DbSession,
) -> Response:
    """Mark specific notification IDs or all notifications as read."""
    if not body.all and not body.ids:
        raise AppError(
            "validation_failed",
            status=422,
            message_key="errors.validation_failed",
        )

    now = utcnow()
    stmt = (
        update(Notification)
        .where(
            Notification.user_id == user.id,
            Notification.read_at.is_(None),
        )
        .values(read_at=now)
    )
    if not body.all and body.ids:
        stmt = stmt.where(Notification.id.in_(body.ids))

    await session.execute(stmt)
    await session.commit()
    return Response(status_code=204)
