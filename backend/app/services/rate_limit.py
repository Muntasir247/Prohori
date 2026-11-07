"""Postgres-backed fixed-window rate limiting (Doc 02 Sections 7 & 11).

Counters live in ``rate_limit_counters`` keyed by ``(key, window_start)``. The
increment is an atomic ``count = count + 1`` update (R10), falling back to an
insert for the first hit of a window. Used for login lockout (R01: 5 failures per
email and IP per 15 minutes) and request limits (R13).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.rate_limit import RateLimitCounter


@dataclass(frozen=True)
class LimitResult:
    allowed: bool
    count: int
    retry_after: int  # seconds until the window resets


def _window_start(now: datetime, window_seconds: int) -> datetime:
    epoch = int(now.timestamp())
    floored = epoch - (epoch % window_seconds)
    return datetime.fromtimestamp(floored, tz=UTC)


def _retry_after(window_start: datetime, window_seconds: int, now: datetime) -> int:
    reset = window_start + timedelta(seconds=window_seconds)
    return max(1, int((reset - now).total_seconds()))


async def _current_count(
    session: AsyncSession, key: str, window_start: datetime
) -> int:
    row = await session.get(RateLimitCounter, (key, window_start))
    return row.count if row else 0


async def hit(
    session: AsyncSession,
    key: str,
    *,
    limit: int,
    window_seconds: int,
) -> LimitResult:
    """Count one event against ``key`` and report whether it is within ``limit``."""
    now = datetime.now(UTC)
    window_start = _window_start(now, window_seconds)

    result = await session.execute(
        update(RateLimitCounter)
        .where(
            RateLimitCounter.key == key,
            RateLimitCounter.window_start == window_start,
        )
        .values(count=RateLimitCounter.count + 1)
    )
    if result.rowcount == 0:
        try:
            session.add(
                RateLimitCounter(key=key, window_start=window_start, count=1)
            )
            await session.flush()
        except IntegrityError:
            await session.rollback()
            await session.execute(
                update(RateLimitCounter)
                .where(
                    RateLimitCounter.key == key,
                    RateLimitCounter.window_start == window_start,
                )
                .values(count=RateLimitCounter.count + 1)
            )

    count = await _current_count(session, key, window_start)
    return LimitResult(
        allowed=count <= limit,
        count=count,
        retry_after=_retry_after(window_start, window_seconds, now),
    )


async def peek(
    session: AsyncSession,
    key: str,
    *,
    limit: int,
    window_seconds: int,
) -> LimitResult:
    """Report the current state of ``key`` without counting a new event."""
    now = datetime.now(UTC)
    window_start = _window_start(now, window_seconds)
    count = await _current_count(session, key, window_start)
    return LimitResult(
        allowed=count < limit,
        count=count,
        retry_after=_retry_after(window_start, window_seconds, now),
    )


async def clear(session: AsyncSession, *keys: str) -> None:
    """Delete all counters for the given keys (e.g. after a successful login)."""
    from sqlalchemy import delete

    for key in keys:
        await session.execute(
            delete(RateLimitCounter).where(RateLimitCounter.key == key)
        )
