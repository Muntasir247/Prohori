"""Account endpoints: profile, password, sessions, export, delete (Doc 02 §9)."""

from __future__ import annotations

import json
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Query, Request, Response, status
from fastapi.responses import JSONResponse

from app.api.cookies import clear_session_cookie, session_cookie_name
from app.api.deps import CurrentUser, DbSession, enforce_csrf
from app.errors import AppError
from app.schemas.auth import UserOut
from app.schemas.me import DeleteAccountIn, MeUpdateIn, PasswordChangeIn, SessionOut
from app.security.tokens import hash_token
from app.services import auth as auth_service

router = APIRouter(prefix="/me", tags=["me"], dependencies=[Depends(enforce_csrf)])


@router.get("")
async def read_me(user: CurrentUser) -> UserOut:
    return UserOut.from_user(user)


@router.patch("")
async def update_me(body: MeUpdateIn, user: CurrentUser, session: DbSession) -> UserOut:
    if body.name is not None:
        user.display_name = body.name.strip()
    if body.language is not None:
        user.language = body.language
    if body.theme is not None:
        user.theme = body.theme
    if body.onboarding_completed:
        user.onboarding_completed_at = user.onboarding_completed_at or datetime.now(UTC)
    await session.flush()
    return UserOut.from_user(user)


@router.post("/password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    body: PasswordChangeIn, user: CurrentUser, session: DbSession
) -> Response:
    await auth_service.change_password(
        session, user=user, current=body.current, new=body.new
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/sessions")
async def list_sessions(
    request: Request, user: CurrentUser, session: DbSession
) -> list[SessionOut]:
    current_token = request.cookies.get(session_cookie_name())
    current_hash = hash_token(current_token) if current_token else None
    rows = await auth_service.list_sessions(session, user.id)
    return [
        SessionOut(
            id=row.id,
            user_agent=row.user_agent,
            last_seen_at=row.last_seen_at,
            created_at=row.created_at,
            current=row.token_hash == current_hash,
        )
        for row in rows
    ]


@router.delete("/sessions", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_sessions(
    request: Request,
    user: CurrentUser,
    session: DbSession,
    id: str | None = Query(default=None),
) -> Response:
    """Revoke one session by id, or every session except the current one."""
    rows = await auth_service.list_sessions(session, user.id)
    current_token = request.cookies.get(session_cookie_name())
    current_hash = hash_token(current_token) if current_token else None

    if id is not None:
        target = next((r for r in rows if str(r.id) == id), None)
        if target is None:
            raise AppError("not_found", status=404, message_key="errors.not_found")
        await auth_service.revoke_session(session, target.id)
    else:
        for row in rows:
            if row.token_hash != current_hash:
                await auth_service.revoke_session(session, row.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/export")
async def export_me(user: CurrentUser, session: DbSession) -> JSONResponse:
    """Export the signed-in user's own data as a downloadable JSON file."""
    rows = await auth_service.list_sessions(session, user.id)
    payload = {
        "exported_at": datetime.now(UTC).isoformat(),
        "profile": UserOut.from_user(user).model_dump(mode="json"),
        "consent_at": user.consent_at.isoformat() if user.consent_at else None,
        "sessions": [
            {
                "user_agent": r.user_agent,
                "last_seen_at": r.last_seen_at.isoformat(),
                "created_at": r.created_at.isoformat(),
            }
            for r in rows
        ],
    }
    body = json.dumps(payload, ensure_ascii=False, indent=2)
    return JSONResponse(
        content=json.loads(body),
        headers={"Content-Disposition": 'attachment; filename="prohori-my-data.json"'},
    )


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def delete_me(
    body: DeleteAccountIn,
    response: Response,
    user: CurrentUser,
    session: DbSession,
) -> Response:
    if body.confirm != "DELETE":
        raise AppError(
            "confirm_required",
            status=422,
            message_key="errors.confirm_required",
            fields={"confirm": "must_equal_DELETE"},
        )
    await auth_service.delete_account(session, user=user)
    clear_session_cookie(response)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response
