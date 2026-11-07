"""Authentication endpoints (Doc 02 Section 9).

register, verify-email, resend-verification, login, logout, forgot-password,
reset-password, accept-invite. Account-discovery-safe endpoints always return
202. All state changes require CSRF (X-Requested-With + Origin) via the router
dependency.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response, status

from app.api.cookies import clear_session_cookie, set_session_cookie
from app.api.deps import (
    DbSession,
    enforce_csrf,
    get_optional_user,
    session_cookie_name,
)
from app.config import get_settings
from app.errors import AppError
from app.schemas.auth import (
    AcceptInviteIn,
    ForgotPasswordIn,
    LoginIn,
    RegisterIn,
    ResendVerificationIn,
    ResetPasswordIn,
    UserOut,
    VerifyEmailIn,
)
from app.services import auth as auth_service
from app.services import rate_limit
from app.services.email import EmailService

router = APIRouter(
    prefix="/auth", tags=["auth"], dependencies=[Depends(enforce_csrf)]
)


def get_email_service() -> EmailService:
    return EmailService(get_settings())


EmailDep = Annotated[EmailService, Depends(get_email_service)]

# Per-IP request limits (Doc 02 Section 11, R13). Resend is 3/hour per email
# (Doc 01 S05).
_IP_HOUR = 3600
_REGISTER_LIMIT = 10
_FORGOT_LIMIT = 5
_RESEND_LIMIT = 3


def _client_ip(request: Request) -> str:
    """Client IP for limiter keys. X-Forwarded-For is trusted only when the app
    sits behind a proxy that sets it (TRUST_PROXY_HEADERS); otherwise it is
    attacker-controlled and would let a client reset its own IP limits."""
    if get_settings().trust_proxy_headers:
        fwd = request.headers.get("x-forwarded-for")
        if fwd:
            return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


async def _limit_or_429(session, key: str, *, limit: int, window: int) -> None:
    result = await rate_limit.hit(session, key, limit=limit, window_seconds=window)
    if not result.allowed:
        raise AppError(
            "rate_limited",
            status=429,
            message_key="errors.rate_limited",
            retry_after=result.retry_after,
        )


@router.post("/register", status_code=status.HTTP_202_ACCEPTED)
async def register(
    body: RegisterIn,
    request: Request,
    session: DbSession,
    email_service: EmailDep,
) -> dict[str, bool]:
    await _limit_or_429(
        session,
        f"register:ip:{auth_service.ip_key(_client_ip(request))}",
        limit=_REGISTER_LIMIT,
        window=_IP_HOUR,
    )
    await auth_service.register(
        session,
        email=body.email,
        password=body.password,
        display_name=body.name,
        language=body.language,
        consent=body.consent,
        email_service=email_service,
    )
    return {"ok": True}


@router.post("/verify-email", status_code=status.HTTP_204_NO_CONTENT)
async def verify_email(body: VerifyEmailIn, session: DbSession) -> Response:
    await auth_service.verify_email(session, token=body.token)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/resend-verification", status_code=status.HTTP_202_ACCEPTED)
async def resend_verification(
    body: ResendVerificationIn,
    request: Request,
    session: DbSession,
    email_service: EmailDep,
) -> dict[str, bool]:
    await _limit_or_429(
        session,
        f"resend:email:{auth_service.email_key(body.email)}",
        limit=_RESEND_LIMIT,
        window=_IP_HOUR,
    )
    await auth_service.resend_verification(
        session, email=body.email, email_service=email_service
    )
    return {"ok": True}


@router.post("/login")
async def login(
    body: LoginIn,
    request: Request,
    response: Response,
    session: DbSession,
) -> UserOut:
    raw, user = await auth_service.login(
        session,
        email=body.email,
        password=body.password,
        ip=_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    set_session_cookie(
        response, raw, max_age=auth_service.session_max_age(user.role)
    )
    return UserOut.from_user(user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    request: Request,
    response: Response,
    session: DbSession,
) -> Response:
    token = request.cookies.get(session_cookie_name())
    if token:
        resolved = await auth_service.resolve_session(session, token)
        if resolved:
            await auth_service.revoke_session(session, resolved[1].id)
    clear_session_cookie(response)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.post("/forgot-password", status_code=status.HTTP_202_ACCEPTED)
async def forgot_password(
    body: ForgotPasswordIn,
    request: Request,
    session: DbSession,
    email_service: EmailDep,
) -> dict[str, bool]:
    await _limit_or_429(
        session,
        f"forgot:ip:{auth_service.ip_key(_client_ip(request))}",
        limit=_FORGOT_LIMIT,
        window=_IP_HOUR,
    )
    # Per-email cap so one inbox cannot be flooded with reset mail (R13).
    await _limit_or_429(
        session,
        f"forgot:email:{auth_service.email_key(body.email)}",
        limit=_RESEND_LIMIT,
        window=_IP_HOUR,
    )
    await auth_service.forgot_password(
        session, email=body.email, email_service=email_service
    )
    return {"ok": True}


@router.post("/reset-password", status_code=status.HTTP_204_NO_CONTENT)
async def reset_password(body: ResetPasswordIn, session: DbSession) -> Response:
    await auth_service.reset_password(
        session, token=body.token, new_password=body.password
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/accept-invite", status_code=status.HTTP_204_NO_CONTENT)
async def accept_invite(body: AcceptInviteIn, session: DbSession) -> Response:
    await auth_service.accept_invite(
        session, token=body.token, display_name=body.name, password=body.password
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/session")
async def current_session(
    user: Annotated[object | None, Depends(get_optional_user)],
) -> UserOut | None:
    """Lightweight 'who am I' probe for the SPA bootstrap. Null when signed out."""
    return UserOut.from_user(user) if user else None
