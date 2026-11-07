"""Postgres-backed rate limiting and lockouts (Doc 02 Sections 7 & 11).

Everything lives in ``rate_limit_counters (key, window_start, count)``:

* **Sliding-window counters.** A limit of N events per W seconds is tracked in
  small buckets (W / 15 each). Each event is one atomic
  ``INSERT ... ON CONFLICT (key, window_start) DO UPDATE SET count = count + 1``
  (R10) — no read-modify-write race, and no rollback of the caller's
  transaction on a concurrent first insert. The total is the sum of the buckets
  that started within the last W seconds, so bursts across a fixed-window
  boundary are still caught.
* **Locks.** A lock is a row keyed ``lock:<key>`` whose ``window_start`` is the
  moment the lock began. It is active for exactly its duration from that
  moment — this is what makes "5 failed logins lock for 15 minutes" (R01) true,
  rather than "until the current fixed window happens to end".

Keys never contain raw emails or IPs; callers pass hashed identifiers.
Old rows are harmless (never summed once outside the window) and are purged by
``purge_before`` from the nightly job.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.rate_limit import RateLimitCounter

_BUCKETS_PER_WINDOW = 15
_LOCK_PREFIX = "lock:"


@dataclass(frozen=True)
class LimitResult:
    allowed: bool
    count: int
    retry_after: int  # seconds until another event would be allowed


def _now() -> datetime:
    return datetime.now(UTC)


def _aware(dt: datetime) -> datetime:
    """SQLite round-trips naive datetimes; treat them as UTC."""
    return dt if dt.tzinfo else dt.replace(tzinfo=UTC)


def _bucket_seconds(window_seconds: int) -> int:
    return max(1, window_seconds // _BUCKETS_PER_WINDOW)


def _floor(now: datetime, step: int) -> datetime:
    epoch = int(now.timestamp())
    return datetime.fromtimestamp(epoch - (epoch % step), tz=UTC)


def _upsert(session: AsyncSession):
    """Dialect-specific INSERT supporting ``on_conflict_do_update``."""
    if session.get_bind().dialect.name == "postgresql":
        from sqlalchemy.dialects.postgresql import insert
    else:
        from sqlalchemy.dialects.sqlite import insert
    return insert


async def _increment(
    session: AsyncSession, key: str, window_start: datetime, by: int = 1
) -> None:
    insert = _upsert(session)
    stmt = insert(RateLimitCounter).values(key=key, window_start=window_start, count=by)
    stmt = stmt.on_conflict_do_update(
        index_elements=["key", "window_start"],
        set_={"count": RateLimitCounter.count + by},
    )
    await session.execute(stmt)


async def _window_state(
    session: AsyncSession, key: str, window_seconds: int, now: datetime
) -> tuple[int, datetime | None]:
    """Return ``(total, oldest_bucket_start)`` for buckets inside the window."""
    since = now - timedelta(seconds=window_seconds)
    row = (
        await session.execute(
            select(
                func.coalesce(func.sum(RateLimitCounter.count), 0),
                func.min(RateLimitCounter.window_start),
            ).where(
                RateLimitCounter.key == key,
                RateLimitCounter.window_start > since,
            )
        )
    ).one()
    total, oldest = int(row[0]), row[1]
    return total, (_aware(oldest) if oldest is not None else None)


def _retry_after(oldest: datetime | None, window_seconds: int, now: datetime) -> int:
    if oldest is None:
        return 0
    reset = oldest + timedelta(seconds=window_seconds)
    return max(1, int((reset - now).total_seconds()))


async def hit(
    session: AsyncSession,
    key: str,
    *,
    limit: int,
    window_seconds: int,
) -> LimitResult:
    """Count one event against ``key``; allowed while the total is ``<= limit``."""
    now = _now()
    await _increment(session, key, _floor(now, _bucket_seconds(window_seconds)))
    total, oldest = await _window_state(session, key, window_seconds, now)
    allowed = total <= limit
    return LimitResult(
        allowed=allowed,
        count=total,
        retry_after=0 if allowed else _retry_after(oldest, window_seconds, now),
    )


async def peek(
    session: AsyncSession,
    key: str,
    *,
    limit: int,
    window_seconds: int,
) -> LimitResult:
    """Report whether one more event would be allowed, without counting it."""
    now = _now()
    total, oldest = await _window_state(session, key, window_seconds, now)
    allowed = total < limit
    return LimitResult(
        allowed=allowed,
        count=total,
        retry_after=0 if allowed else _retry_after(oldest, window_seconds, now),
    )


async def clear(session: AsyncSession, *keys: str) -> None:
    """Delete every counter for the given keys (e.g. after a successful login)."""
    for key in keys:
        await session.execute(
            delete(RateLimitCounter).where(RateLimitCounter.key == key)
        )


# --- Locks -----------------------------------------------------------------
async def lock(session: AsyncSession, key: str) -> None:
    """Start a lock on ``key`` now. Its duration is chosen when checking it."""
    await _increment(session, _LOCK_PREFIX + key, _now())


async def locked_for(session: AsyncSession, key: str, *, seconds: int) -> int:
    """Seconds left on the most recent lock of ``key`` (0 when not locked)."""
    now = _now()
    started = (
        await session.execute(
            select(func.max(RateLimitCounter.window_start)).where(
                RateLimitCounter.key == _LOCK_PREFIX + key,
                RateLimitCounter.window_start > now - timedelta(seconds=seconds),
            )
        )
    ).scalar_one_or_none()
    if started is None:
        return 0
    remaining = _aware(started) + timedelta(seconds=seconds) - now
    return max(1, int(remaining.total_seconds()))


async def purge_before(session: AsyncSession, cutoff: datetime) -> None:
    """Remove counters and locks older than ``cutoff`` (nightly housekeeping)."""
    await session.execute(
        delete(RateLimitCounter).where(RateLimitCounter.window_start < cutoff)
    )
