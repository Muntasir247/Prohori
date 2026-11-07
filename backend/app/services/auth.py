"""Authentication use cases (Doc 02 Section 7).

Business logic for registration, email verification, login with lockout,
password reset, reviewer invites, sessions and account management. Routers call
these; repositories/queries live inline here for the auth domain.

Security invariants:
* Passwords: argon2id, 10+ chars, common-password blocklist.
* Only SHA-256 hashes of session and one-time tokens are stored.
* Account discovery is impossible: register / forgot / resend behave identically
  whether or not the email exists.
* 5 failed logins per email and per IP within 15 minutes lock for 15 minutes,
  with the same error for every failure.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.errors import AppError
from app.models.auth_token import AuthToken, TokenPurpose
from app.models.session import Session
from app.models.user import User, UserRole
from app.security import passwords
from app.security.tokens import hash_token, new_token
from app.services import audit, rate_limit

# --- Lifetimes (Doc 02 Section 7) ------------------------------------------
USER_SESSION_TTL = timedelta(days=30)
STAFF_SESSION_TTL = timedelta(hours=8)
STAFF_IDLE_TTL = timedelta(minutes=30)

VERIFY_TTL = timedelta(hours=24)
RESET_TTL = timedelta(minutes=30)
INVITE_TTL = timedelta(hours=48)

# --- Login defence (Doc 02 Sections 7 & 11, R01) ---------------------------
# 5 failures per email and per IP within 15 minutes start a 15-minute lock.
LOGIN_MAX_FAILS = 5
LOGIN_WINDOW_SECONDS = 15 * 60
LOGIN_LOCK_SECONDS = 15 * 60

_STAFF_ROLES = {UserRole.reviewer.value, UserRole.admin.value}

# A real argon2id hash of a throwaway value. Verifying against it when the email
# is unknown makes a failed login cost the same as a wrong password, so response
# time does not reveal whether an account exists. Built lazily (argon2 is slow).
_dummy_hash: str | None = None


def _timing_dummy_hash() -> str:
    global _dummy_hash
    if _dummy_hash is None:
        _dummy_hash = passwords.hash_password(new_token())
    return _dummy_hash


def normalize_email(email: str) -> str:
    return email.strip().lower()


def email_key(email: str) -> str:
    """Opaque, non-reversible identifier for an email in limiter keys/audit."""
    return hash_token(normalize_email(email))


def ip_key(ip: str | None) -> str:
    return hash_token(ip or "unknown")


# --- User lookup -----------------------------------------------------------
async def get_user_by_email(session: AsyncSession, email: str) -> User | None:
    result = await session.execute(
        select(User).where(User.email == normalize_email(email))
    )
    return result.scalar_one_or_none()


# --- One-time tokens -------------------------------------------------------
async def _mint_token(
    session: AsyncSession,
    *,
    purpose: TokenPurpose,
    ttl: timedelta,
    user_id=None,
    email: str | None = None,
    role: str | None = None,
) -> str:
    raw = new_token()
    session.add(
        AuthToken(
            user_id=user_id,
            email=normalize_email(email) if email else None,
            purpose=purpose.value,
            role=role,
            token_hash=hash_token(raw),
            expires_at=datetime.now(UTC) + ttl,
        )
    )
    await session.flush()
    return raw


async def _consume_token(
    session: AsyncSession, *, purpose: TokenPurpose, raw: str
) -> AuthToken:
    """Return a valid, unused, unexpired token and mark it used, or raise 410."""
    result = await session.execute(
        select(AuthToken).where(
            AuthToken.token_hash == hash_token(raw),
            AuthToken.purpose == purpose.value,
        )
    )
    token = result.scalar_one_or_none()
    now = datetime.now(UTC)
    if token is None or token.used_at is not None or _aware(token.expires_at) < now:
        raise AppError("token_invalid", status=410, message_key="errors.token_invalid")
    token.used_at = now
    await session.flush()
    return token


def _aware(dt: datetime) -> datetime:
    """SQLite round-trips naive datetimes; treat them as UTC for comparison."""
    return dt if dt.tzinfo else dt.replace(tzinfo=UTC)


# --- Sessions --------------------------------------------------------------
def _session_ttl(role: str) -> timedelta:
    return STAFF_SESSION_TTL if role in _STAFF_ROLES else USER_SESSION_TTL


def session_max_age(role: str) -> int:
    """Cookie ``max-age`` in seconds for a role's session lifetime."""
    return int(_session_ttl(role).total_seconds())


async def create_session(
    session: AsyncSession, user: User, *, user_agent: str | None = None
) -> str:
    """Create a session row and return the raw cookie token (stored hashed)."""
    raw = new_token()
    now = datetime.now(UTC)
    session.add(
        Session(
            user_id=user.id,
            token_hash=hash_token(raw),
            user_agent=(user_agent or "")[:200] or None,
            last_seen_at=now,
            expires_at=now + _session_ttl(user.role),
        )
    )
    await session.flush()
    return raw


async def resolve_session(
    session: AsyncSession, raw_token: str
) -> tuple[User, Session] | None:
    """Validate a session cookie, applying expiry and staff idle timeout.

    On success the session's ``last_seen_at`` is refreshed and its expiry rolls
    forward. Returns ``None`` for any missing/expired/idle session.
    """
    result = await session.execute(
        select(Session).where(Session.token_hash == hash_token(raw_token))
    )
    row = result.scalar_one_or_none()
    if row is None:
        return None

    now = datetime.now(UTC)
    if _aware(row.expires_at) < now:
        await session.delete(row)
        await session.flush()
        return None

    user = await session.get(User, row.user_id)
    if user is None or not user.is_active:
        return None

    if user.role in _STAFF_ROLES:
        if now - _aware(row.last_seen_at) > STAFF_IDLE_TTL:
            await session.delete(row)
            await session.flush()
            return None

    row.last_seen_at = now
    row.expires_at = now + _session_ttl(user.role)
    await session.flush()
    return user, row


async def revoke_session(session: AsyncSession, session_id) -> None:
    await session.execute(delete(Session).where(Session.id == session_id))


async def revoke_all_sessions(session: AsyncSession, user_id) -> None:
    await session.execute(delete(Session).where(Session.user_id == user_id))


async def list_sessions(session: AsyncSession, user_id) -> list[Session]:
    result = await session.execute(
        select(Session)
        .where(Session.user_id == user_id)
        .order_by(Session.last_seen_at.desc())
    )
    return list(result.scalars().all())


# --- Registration & verification ------------------------------------------
async def register(
    session: AsyncSession,
    *,
    email: str,
    password: str,
    display_name: str,
    language: str,
    consent: bool,
    email_service,
) -> None:
    """Create an unverified account and email a verification link.

    Always succeeds from the caller's point of view (the route returns 202
    regardless) so the response cannot reveal whether the email already exists.
    """
    if not consent:
        raise AppError(
            "consent_required",
            status=422,
            message_key="errors.consent_required",
            fields={"consent": "required"},
        )
    passwords.validate_password(password)
    norm = normalize_email(email)

    existing = await get_user_by_email(session, norm)
    if existing is not None:
        # Do not disclose existence — not in the response, and not in timing:
        # spend the same argon2 work the new-account path spends.
        passwords.hash_password(password)
        # If the account is still unverified, quietly resend the verification
        # link so a legitimate retry still works.
        if existing.email_verified_at is None:
            token = await _mint_token(
                session,
                purpose=TokenPurpose.verify_email,
                ttl=VERIFY_TTL,
                user_id=existing.id,
                email=norm,
            )
            await email_service.send_verification(norm, token)
        return

    user = User(
        email=norm,
        password_hash=passwords.hash_password(password),
        display_name=display_name.strip(),
        language=language if language in ("bn", "en") else "bn",
        role=UserRole.user.value,
        consent_at=datetime.now(UTC),
    )
    session.add(user)
    await session.flush()

    token = await _mint_token(
        session,
        purpose=TokenPurpose.verify_email,
        ttl=VERIFY_TTL,
        user_id=user.id,
        email=norm,
    )
    await email_service.send_verification(norm, token)


async def verify_email(session: AsyncSession, *, token: str) -> None:
    record = await _consume_token(session, purpose=TokenPurpose.verify_email, raw=token)
    user = None
    if record.user_id is not None:
        user = await session.get(User, record.user_id)
    elif record.email is not None:
        user = await get_user_by_email(session, record.email)
    if user is None:
        raise AppError("token_invalid", status=410, message_key="errors.token_invalid")
    if user.email_verified_at is None:
        user.email_verified_at = datetime.now(UTC)
    await session.flush()


async def resend_verification(
    session: AsyncSession, *, email: str, email_service
) -> None:
    """Resend the verification link. No-op if unknown or already verified."""
    user = await get_user_by_email(session, email)
    if user is None or user.email_verified_at is not None:
        return
    token = await _mint_token(
        session,
        purpose=TokenPurpose.verify_email,
        ttl=VERIFY_TTL,
        user_id=user.id,
        email=user.email,
    )
    await email_service.send_verification(user.email, token)


# --- Login -----------------------------------------------------------------
def _same_login_error() -> AppError:
    # One error for wrong email, wrong password, or inactive account (R01/R02).
    return AppError(
        "invalid_credentials", status=401, message_key="errors.invalid_credentials"
    )


async def login(
    session: AsyncSession,
    *,
    email: str,
    password: str,
    ip: str | None,
    user_agent: str | None = None,
) -> tuple[str, User]:
    """Authenticate and return ``(raw_session_token, user)``, or raise.

    Raises 429 when locked, 401 for any credential failure (identical message),
    403 when the email is not yet verified.
    """
    norm = normalize_email(email)
    keys = {
        "email": f"login:email:{email_key(norm)}",
        "ip": f"login:ip:{ip_key(ip)}",
    }

    # Lockout check first, before touching the password: a locked account
    # refuses even the correct password until the lock expires.
    for key in keys.values():
        remaining = await rate_limit.locked_for(
            session, key, seconds=LOGIN_LOCK_SECONDS
        )
        if remaining:
            raise AppError(
                "rate_limited",
                status=429,
                message_key="errors.login_locked",
                retry_after=remaining,
            )

    user = await get_user_by_email(session, norm)
    if user is None:
        passwords.verify_password(_timing_dummy_hash(), password)
        ok = False
    else:
        ok = passwords.verify_password(user.password_hash, password) and user.is_active

    if not ok:
        for scope, key in keys.items():
            result = await rate_limit.hit(
                session,
                key,
                limit=LOGIN_MAX_FAILS,
                window_seconds=LOGIN_WINDOW_SECONDS,
            )
            if result.count >= LOGIN_MAX_FAILS:
                # The 5th failure starts a full 15-minute lock from now.
                await rate_limit.lock(session, key)
                await rate_limit.clear(session, key)
                await audit.record(
                    session,
                    action="login_locked",
                    entity_type="login_" + scope,
                    entity_id=key.rsplit(":", 1)[-1],
                    after={"lock_seconds": LOGIN_LOCK_SECONDS},
                )
        # Persist the failure count now: the request ends in a 401, and the
        # request-scoped unit of work would otherwise roll these increments back,
        # defeating the lockout (R01).
        await session.commit()
        raise _same_login_error()

    if user.email_verified_at is None:
        raise AppError(
            "email_unverified", status=403, message_key="errors.email_unverified"
        )

    # Success clears the failure counters and rehashes if parameters changed.
    await rate_limit.clear(session, *keys.values())
    if passwords.needs_rehash(user.password_hash):
        user.password_hash = passwords.hash_password(password)

    raw = await create_session(session, user, user_agent=user_agent)
    return raw, user


# --- Password reset --------------------------------------------------------
async def forgot_password(session: AsyncSession, *, email: str, email_service) -> None:
    """Start a reset. Silent no-op for unknown emails (no account discovery)."""
    user = await get_user_by_email(session, email)
    if user is None:
        return
    token = await _mint_token(
        session,
        purpose=TokenPurpose.reset_password,
        ttl=RESET_TTL,
        user_id=user.id,
        email=user.email,
    )
    await email_service.send_password_reset(user.email, token)


async def reset_password(
    session: AsyncSession, *, token: str, new_password: str
) -> None:
    passwords.validate_password(new_password)
    record = await _consume_token(
        session, purpose=TokenPurpose.reset_password, raw=token
    )
    user = await session.get(User, record.user_id) if record.user_id else None
    if user is None:
        raise AppError("token_invalid", status=410, message_key="errors.token_invalid")
    user.password_hash = passwords.hash_password(new_password)
    # A reset is also an email proof, so confirm verification if still pending.
    if user.email_verified_at is None:
        user.email_verified_at = datetime.now(UTC)
    # Revoke every session: a reset must log out all devices (Doc 01 S07).
    await revoke_all_sessions(session, user.id)
    await audit.record(
        session,
        action="password_reset",
        entity_type="user",
        entity_id=str(user.id),
        actor_id=user.id,
        actor_role=user.role,
        after={"sessions_revoked": True},
    )
    await session.flush()


# --- Reviewer invites ------------------------------------------------------
async def create_invite(
    session: AsyncSession, *, email: str, role: str, email_service
) -> str:
    """Mint and email a reviewer/admin invite; returns the raw token (tests)."""
    norm = normalize_email(email)
    token = await _mint_token(
        session,
        purpose=TokenPurpose.invite,
        ttl=INVITE_TTL,
        email=norm,
        role=role,
    )
    await email_service.send_invite(norm, token)
    return token


async def accept_invite(
    session: AsyncSession, *, token: str, display_name: str, password: str
) -> None:
    passwords.validate_password(password)
    record = await _consume_token(session, purpose=TokenPurpose.invite, raw=token)
    if record.email is None:
        raise AppError("token_invalid", status=410, message_key="errors.token_invalid")
    role = record.role or UserRole.reviewer.value
    now = datetime.now(UTC)
    user = await get_user_by_email(session, record.email)
    before_role = user.role if user is not None else None
    if user is None:
        user = User(
            email=record.email,
            password_hash=passwords.hash_password(password),
            display_name=display_name.strip(),
            role=role,
            email_verified_at=now,
            consent_at=now,
        )
        session.add(user)
    else:
        user.password_hash = passwords.hash_password(password)
        user.display_name = display_name.strip()
        user.role = role
        user.email_verified_at = user.email_verified_at or now
        user.is_active = True
    await session.flush()
    # Role changes always go to audit (Doc 02 Section 7, admin safety).
    await audit.record(
        session,
        action="invite_accepted",
        entity_type="user",
        entity_id=str(user.id),
        actor_id=user.id,
        actor_role=role,
        before={"role": before_role} if before_role else None,
        after={"role": role},
    )
    await session.flush()


# --- Account management ----------------------------------------------------
async def change_password(
    session: AsyncSession, *, user: User, current: str, new: str
) -> None:
    if not passwords.verify_password(user.password_hash, current):
        raise AppError(
            "invalid_credentials",
            status=401,
            message_key="errors.invalid_credentials",
            fields={"current": "wrong"},
        )
    try:
        passwords.validate_password(new)
    except AppError as exc:
        # Report the weakness on the form's `new` field, not a generic one.
        exc.fields = {"new": next(iter(exc.fields.values()), "invalid")}
        raise
    user.password_hash = passwords.hash_password(new)
    await audit.record(
        session,
        action="password_changed",
        entity_type="user",
        entity_id=str(user.id),
        actor_id=user.id,
        actor_role=user.role,
    )
    await session.flush()


async def delete_account(session: AsyncSession, *, user: User) -> None:
    """Delete the account. Sessions and tokens cascade; the audit row keeps only
    the opaque user id, never the email."""
    user_id, role = user.id, user.role
    await revoke_all_sessions(session, user_id)
    await session.delete(user)
    await audit.record(
        session,
        action="account_deleted",
        entity_type="user",
        entity_id=str(user_id),
        actor_id=user_id,
        actor_role=role,
    )
    await session.flush()
