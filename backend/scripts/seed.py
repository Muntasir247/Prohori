"""Idempotent seed for Prohori's simulated prototype data.

Loads the reference data from ``backend/seed/*.json`` (scam types, samples, tips,
safe actions and the Prompt-P4 message dataset) and generates a realistic body of
*simulated* history — about 500 checks over 90 days, repeat numbers, campaigns and
about 120 cases across every status — so the dashboard and reviewer workbench have
something to show. Everything is fictional (CLAUDE.md: simulated data only).

Non-negotiable rules honoured here:
  * No raw message text, full phone numbers, OTPs or PINs are ever stored. Message
    text is PII-masked (digit runs removed) before storage; phone numbers are kept
    only as an HMAC plus a masked display; the original text is kept only as a
    SHA-256 hash.
  * The seed never marks anything "safe": ``final_level`` is only Low/Medium/High,
    and Low always keeps a caution via its safe actions.
  * Next steps reference only ``safe_actions`` ids.

Idempotency: reference rows upsert by primary key; the large simulated set uses
deterministic ``uuid5`` ids and ``ON CONFLICT DO NOTHING``, so running the seed
twice leaves identical rows and identical counts.

Usage (run from ``backend/``)::

    python scripts/seed.py              # seed the configured database
    python scripts/seed.py --dry-run    # build + validate everything, touch no DB

Demo-user passwords are read from the environment and never hard-coded::

    SEED_USER_PASSWORD, SEED_REVIEWER_PASSWORD, SEED_ADMIN_PASSWORD
"""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import hmac
import json
import os
import random
import re
import sys
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from typing import Any
from uuid import NAMESPACE_URL, uuid5

# Make the backend package importable when run as ``python scripts/seed.py``.
BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

SEED_DIR = BACKEND_DIR / "seed"
SEED_TAG = "simulated-v1"

# A fixed reference "now" keeps generation deterministic across runs so re-seeding
# produces identical timestamps (and therefore identical rows).
NOW = datetime(2025, 11, 8, 12, 0, 0, tzinfo=UTC)

N_CHECKS = 500
N_CASES = 120
N_NUMBERS = 40
N_GUEST_BUCKETS = 137

# Reserved fictional number range (Prompt P4): 01700000000–01799999999.
NUMBER_PREFIX = "017"

CASE_STATUSES = [
    "new",
    "in_review",
    "confirmed_scam",
    "not_scam",
    "escalated",
    "closed",
]
DECIDED_STATUSES = {"confirmed_scam", "not_scam", "closed", "escalated"}

# messages.json uses descriptive scam_type slugs; map them to scam_types.id.
MSG_SCAM_TO_ID: dict[str, int | None] = {
    "fake_otp_pin_request": 1,
    "fake_otp_pin": 1,
    "fake_bank_or_wallet_staff": 2,
    "fake_staff": 2,
    "prize_or_cashback": 3,
    "prize_cashback": 3,
    "wrong_number_refund": 4,
    "fake_agent": 5,
    "other": 6,
    "none": None,
    None: None,
}

# Deterministic uuid5 namespaces, derived from the seed tag.
NS_ROOT = uuid5(NAMESPACE_URL, f"prohori:{SEED_TAG}")
NS_CHECK = uuid5(NS_ROOT, "check")
NS_CASE = uuid5(NS_ROOT, "case")
NS_NOTE = uuid5(NS_ROOT, "note")
NS_NUM = uuid5(NS_ROOT, "number")
NS_CAMP = uuid5(NS_ROOT, "campaign")
NS_USER = uuid5(NS_ROOT, "user")

_DIGIT_RUN = re.compile(r"[0-9০-৯]{4,}")


# --------------------------------------------------------------------------- #
# Small helpers
# --------------------------------------------------------------------------- #
def load_json(name: str) -> Any:
    path = SEED_DIR / name
    if not path.exists():
        raise SystemExit(
            f"seed: required file {path} is missing. "
            "Generate backend/seed/messages.json with Prompt P4 first."
        )
    with path.open(encoding="utf-8") as fh:
        return json.load(fh)


def mask_text(text: str) -> str:
    """Remove any run of 4+ digits (phone numbers, OTPs, PINs, amounts)."""
    return _DIGIT_RUN.sub("••••", text)


def sha256_hex(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def number_hmac(key: str, number: str) -> str:
    return hmac.new(key.encode("utf-8"), number.encode("utf-8"), "sha256").hexdigest()


def mask_number(number: str) -> str:
    """``01712345678`` -> ``01712•••••78`` (varchar(24), no full number stored)."""
    if len(number) <= 7:
        return number[:2] + "•" * max(0, len(number) - 2)
    return number[:5] + "•" * (len(number) - 7) + number[-2:]


def pg_text_array(values: list[str]) -> str:
    """Render a Postgres ``text[]`` literal; values here are controlled slugs."""
    return "{" + ",".join(values) + "}"


def require_password(env_name: str, dry_run: bool) -> str:
    value = os.environ.get(env_name)
    if value:
        return value
    if dry_run:
        return "<dry-run-placeholder>"
    raise SystemExit(
        f"seed: environment variable {env_name} is not set. "
        "Set SEED_USER_PASSWORD, SEED_REVIEWER_PASSWORD and SEED_ADMIN_PASSWORD "
        "(10+ characters each) before seeding."
    )


# --------------------------------------------------------------------------- #
# Dataset construction (pure: no database access)
# --------------------------------------------------------------------------- #
def build_dataset(hmac_key: str, *, dry_run: bool) -> dict[str, list[dict[str, Any]]]:
    """Build every row in memory, deterministically. No I/O to the database."""
    rng = random.Random(f"{SEED_TAG}:{N_CHECKS}:{N_CASES}")

    scam_types = load_json("scam_types.json")
    samples = load_json("samples.json")
    tips = load_json("tips.json")
    safe_actions = load_json("safe_actions.json")
    messages = load_json("messages.json")
    if not isinstance(messages, list) or not messages:
        raise SystemExit("seed: messages.json must be a non-empty JSON array.")

    valid_scam_ids = {row["id"] for row in scam_types}

    # --- demo users ------------------------------------------------------- #
    users = _build_users(dry_run)

    # --- repeat numbers --------------------------------------------------- #
    numbers = _build_numbers(rng, hmac_key)

    # --- checks + check/number links -------------------------------------- #
    checks, check_numbers = _build_checks(rng, messages, users, numbers)

    # --- campaigns -------------------------------------------------------- #
    campaigns = _build_campaigns(rng)

    # --- cases + notes ---------------------------------------------------- #
    cases, case_notes = _build_cases(rng, checks, users, campaigns, numbers)

    # Roll per-number aggregates up from the checks and cases that reference them.
    _roll_up_numbers(numbers, checks, check_numbers, cases)

    # --- daily aggregates ------------------------------------------------- #
    daily = _build_daily_aggregates(checks, cases)

    # --- validation ------------------------------------------------------- #
    _validate(
        scam_types,
        samples,
        tips,
        safe_actions,
        users,
        checks,
        cases,
        valid_scam_ids,
    )

    return {
        "scam_types": scam_types,
        "samples": samples,
        "tips": tips,
        "safe_actions": safe_actions,
        "users": users,
        "numbers": numbers,
        "checks": checks,
        "check_numbers": check_numbers,
        "campaigns": campaigns,
        "cases": cases,
        "case_notes": case_notes,
        "daily_aggregates": daily,
    }


def _build_users(dry_run: bool) -> list[dict[str, Any]]:
    specs = [
        ("user", "user@prohori.test", "Rahim (demo user)", "SEED_USER_PASSWORD"),
        (
            "reviewer",
            "reviewer@prohori.test",
            "Nadia (demo reviewer)",
            "SEED_REVIEWER_PASSWORD",
        ),
        ("admin", "admin@prohori.test", "Admin (demo)", "SEED_ADMIN_PASSWORD"),
    ]
    hash_password = None
    if not dry_run:
        from app.security.passwords import hash_password as _hp
        from app.security.passwords import validate_password

        hash_password = _hp
        _validate = validate_password
    else:
        _validate = None

    users: list[dict[str, Any]] = []
    for role, email, name, env_name in specs:
        raw = require_password(env_name, dry_run)
        if _validate is not None:
            _validate(raw)
        pw_hash = hash_password(raw) if hash_password else "<argon2id@runtime>"
        users.append(
            {
                "id": uuid5(NS_USER, email),
                "email": email,
                "password_hash": pw_hash,
                "display_name": name,
                "role": role,
                "language": "bn",
                "theme": "system",
                "email_verified_at": NOW - timedelta(days=80),
                "onboarding_completed_at": NOW - timedelta(days=80),
                "consent_at": NOW - timedelta(days=80),
                "is_active": True,
                "created_at": NOW - timedelta(days=80),
                "updated_at": NOW - timedelta(days=80),
            }
        )
    return users


def _build_numbers(rng: random.Random, hmac_key: str) -> list[dict[str, Any]]:
    numbers: list[dict[str, Any]] = []
    seen: set[str] = set()
    while len(numbers) < N_NUMBERS:
        suffix = rng.randint(0, 99_999_999)
        number = f"{NUMBER_PREFIX}{suffix:08d}"
        if number in seen:
            continue
        seen.add(number)
        numbers.append(
            {
                "id": uuid5(NS_NUM, number),
                "number": number,  # never stored; dropped before DB write
                "number_hmac": number_hmac(hmac_key, number),
                "masked_display": mask_number(number),
                "check_count": 0,
                "report_count": 0,
                "high_count": 0,
                "status": "watch",
                "first_seen_at": NOW,
                "last_seen_at": NOW - timedelta(days=90),
            }
        )
    return numbers


def _build_checks(
    rng: random.Random,
    messages: list[dict[str, Any]],
    users: list[dict[str, Any]],
    numbers: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    user_row = next(u for u in users if u["role"] == "user")
    routes = ["rules_only", "haiku", "sonnet", "fallback"]
    route_weights = [0.25, 0.45, 0.25, 0.05]
    channels = ["sms", "whatsapp", "messenger", "call", "in_app"]
    providers = ["bkash", "nagad", "rocket", "upay", "bank"]

    checks: list[dict[str, Any]] = []
    check_numbers: list[dict[str, Any]] = []

    for i in range(N_CHECKS):
        msg = messages[i % len(messages)]
        lang = msg.get("language", "bn")
        is_scam = msg.get("label") == "scam"
        scam_type_id = MSG_SCAM_TO_ID.get(msg.get("scam_type"))

        created = NOW - timedelta(
            days=rng.randint(0, 89),
            hours=rng.randint(0, 23),
            minutes=rng.randint(0, 59),
        )

        if is_scam:
            final = "High" if rng.random() < 0.6 else "Medium"
        else:
            final = "Low" if rng.random() < 0.7 else "Medium"

        kind = "payment" if rng.random() < 0.35 else "message"
        route = rng.choices(routes, weights=route_weights, k=1)[0]
        is_guest = rng.random() < 0.5

        check_id = uuid5(NS_CHECK, f"check:{i}")
        safe_ids = ["do_not_send", "confirm_another_way", "check_in_official_app"]
        if is_scam:
            safe_ids.append("keep_evidence")
            if final == "High":
                safe_ids.append("call_provider_helpline")

        reasons = _reasons_for(is_scam, final)

        if route == "rules_only":
            model_name = None
            input_tokens = None
            output_tokens = None
        else:
            model_name = (
                "claude-sonnet-5-5" if route == "sonnet" else "claude-haiku-5-5"
            )
            input_tokens = rng.randint(400, 1200)
            output_tokens = rng.randint(80, 300)

        payment_fields: dict[str, Any] = {
            "amount_bdt": None,
            "recipient_status": None,
            "request_channel": None,
            "rushed": None,
            "provider": None,
            "local_hour": None,
        }
        if kind == "payment":
            payment_fields = {
                "amount_bdt": float(rng.choice([500, 1000, 2500, 5000, 10000, 15000])),
                "recipient_status": rng.choice(["known", "new", "not_sure"]),
                "request_channel": rng.choice(channels),
                "rushed": "yes" if is_scam else rng.choice(["no", "not_sure"]),
                "provider": rng.choice(providers),
                "local_hour": created.hour,
            }

        checks.append(
            {
                "id": check_id,
                "user_id": None if is_guest else user_row["id"],
                "guest_hash": (
                    sha256_hex(f"{SEED_TAG}:guest:{i % N_GUEST_BUCKETS}")
                    if is_guest
                    else None
                ),
                "kind": kind,
                "masked_text": mask_text(msg["text"]),
                "text_hash": sha256_hex(msg["text"].strip().lower()),
                "trimmed": len(msg["text"]) > 400,
                "detected_lang": lang,
                "response_lang": "en" if lang == "en" else "bn",
                "claimed_sender": rng.choice([None, "bank", "wallet", "agent"]),
                "extracted": {"seed": SEED_TAG, "simulated": True},
                "rule_hits": _rule_hits(is_scam),
                "rule_level": final if route == "rules_only" else _step_down(final),
                "llm_level": None if route == "rules_only" else final,
                "model_prob": (
                    None if route == "rules_only" else round(rng.uniform(0.5, 0.99), 4)
                ),
                "final_level": final,
                "reasons": reasons,
                "red_flags": _red_flags(is_scam),
                "highlights": [],
                "safe_action_ids": safe_ids,
                "scam_type_id": scam_type_id,
                "route": route,
                "is_fallback": route == "fallback",
                "prompt_version": "P1@2025-10",
                "model_name": model_name,
                "risk_model_version": "pay-risk@0.1",
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "latency_ms": rng.randint(120, 2400),
                "created_at": created,
                **payment_fields,
            }
        )

        # Scam checks (and a few genuine ones) carry an associated number.
        if is_scam or rng.random() < 0.15:
            weights = [1.0 / (idx + 1) for idx in range(len(numbers))]
            num = rng.choices(numbers, weights=weights, k=1)[0]
            role = "sender" if kind == "message" else "recipient"
            check_numbers.append(
                {
                    "check_id": check_id,
                    "number_id": num["id"],
                    "role": role,
                    "_final": final,
                    "_created": created,
                }
            )

    return checks, check_numbers


def _build_campaigns(rng: random.Random) -> list[dict[str, Any]]:
    labels = [
        ("OTP harvest wave", 1),
        ("Fake KYC callers", 2),
        ("Eid cashback lure", 3),
        ("Wrong-number refund ring", 4),
        ("Fake agent onboarding", 5),
        ("Mixed prize spam", 3),
    ]
    campaigns: list[dict[str, Any]] = []
    for label, scam_type_id in labels:
        count_7d = rng.randint(4, 30)
        prev = rng.randint(2, 28)
        campaigns.append(
            {
                "id": uuid5(NS_CAMP, label),
                "label": label,
                "scam_type_id": scam_type_id,
                "member_count": rng.randint(3, 18),
                "count_7d": count_7d,
                "prev_count_7d": prev,
                "is_surging": count_7d > prev * 1.3,
                "first_seen_at": NOW - timedelta(days=rng.randint(40, 90)),
                "last_seen_at": NOW - timedelta(days=rng.randint(0, 5)),
                "updated_at": NOW,
            }
        )
    return campaigns


def _build_cases(
    rng: random.Random,
    checks: list[dict[str, Any]],
    users: list[dict[str, Any]],
    campaigns: list[dict[str, Any]],
    numbers: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    reviewer = next(u for u in users if u["role"] == "reviewer")
    admin = next(u for u in users if u["role"] == "admin")

    # Prefer the riskier checks as the ones that got reported.
    ranked = sorted(
        checks,
        key=lambda c: (
            {"High": 0, "Medium": 1, "Low": 2}[c["final_level"]],
            str(c["id"]),
        ),
    )
    chosen = ranked[:N_CASES]

    cases: list[dict[str, Any]] = []
    case_notes: list[dict[str, Any]] = []

    for j, check in enumerate(chosen):
        status = CASE_STATUSES[j % len(CASE_STATUSES)]
        case_id = uuid5(NS_CASE, f"case:{j}")
        created = check["created_at"] + timedelta(hours=rng.randint(1, 48))
        assigned = None
        decided_by = None
        decided_at = None
        decision_reason = None

        if status != "new":
            assigned = rng.choice([reviewer["id"], admin["id"]])
        if status in DECIDED_STATUSES:
            decided_by = assigned or reviewer["id"]
            decided_at = created + timedelta(hours=rng.randint(2, 72))
            decision_reason = _decision_reason(status)

        cases.append(
            {
                "id": case_id,
                "check_id": check["id"],
                "status": status,
                "assigned_to": assigned,
                "reporter_note": rng.choice(
                    [
                        None,
                        "Looks like a scam, got this twice.",
                        "Not sure, please check.",
                    ]
                ),
                "reporter_consent_at": check["created_at"],
                "scam_type_id": check["scam_type_id"],
                "campaign_id": (
                    rng.choice(campaigns)["id"] if rng.random() < 0.4 else None
                ),
                "decided_by": decided_by,
                "decided_at": decided_at,
                "decision_reason": decision_reason,
                "version": 1,
                "created_at": created,
                "updated_at": decided_at or created,
                "_final": check["final_level"],
            }
        )

        if status != "new":
            for k in range(rng.randint(1, 2)):
                case_notes.append(
                    {
                        "id": uuid5(NS_NOTE, f"{case_id}:{k}"),
                        "case_id": case_id,
                        "author_id": assigned,
                        "body": _note_body(k),
                        "created_at": created + timedelta(hours=k + 1),
                    }
                )

    return cases, case_notes


def _roll_up_numbers(
    numbers: list[dict[str, Any]],
    checks: list[dict[str, Any]],
    check_numbers: list[dict[str, Any]],
    cases: list[dict[str, Any]],
) -> None:
    by_id = {n["id"]: n for n in numbers}
    reported_checks = {c["check_id"] for c in cases}

    for link in check_numbers:
        num = by_id[link["number_id"]]
        num["check_count"] += 1
        if link["_final"] == "High":
            num["high_count"] += 1
        num["first_seen_at"] = min(num["first_seen_at"], link["_created"])
        num["last_seen_at"] = max(num["last_seen_at"], link["_created"])
        if link["check_id"] in reported_checks:
            num["report_count"] += 1

    for num in numbers:
        if num["high_count"] >= 3 or num["report_count"] >= 2:
            num["status"] = "confirmed_risky"
        elif num["check_count"] == 0:
            num["status"] = "cleared"
        else:
            num["status"] = "watch"


def _build_daily_aggregates(
    checks: list[dict[str, Any]],
    cases: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    agg: dict[tuple[date, str, int], dict[str, int]] = {}

    def slot(day: date, level: str, scam_type_id: int | None) -> dict[str, int]:
        key = (day, level, scam_type_id or 0)
        return agg.setdefault(
            key,
            {"check_count": 0, "case_count": 0, "decided_count": 0, "agreed_count": 0},
        )

    for c in checks:
        slot(c["created_at"].date(), c["final_level"], c["scam_type_id"])[
            "check_count"
        ] += 1

    check_level = {c["id"]: c["final_level"] for c in checks}
    for case in cases:
        level = check_level[case["check_id"]]
        row = slot(case["created_at"].date(), level, case["scam_type_id"])
        row["case_count"] += 1
        if case["decided_at"] is not None:
            row["decided_count"] += 1
            if case["status"] == "confirmed_scam":
                row["agreed_count"] += 1

    return [
        {
            "day": day,
            "risk_level": level,
            "scam_type_id": scam_type_id,
            **counts,
        }
        for (day, level, scam_type_id), counts in agg.items()
    ]


# --------------------------------------------------------------------------- #
# Row content helpers
# --------------------------------------------------------------------------- #
def _reasons_for(is_scam: bool, final: str) -> list[str]:
    if is_scam:
        return [
            "Message asks for a code, PIN or urgent payment.",
            "Pressure and urgency are common scam tactics.",
        ]
    if final == "Medium":
        return ["Some details could not be confirmed — stay cautious."]
    return ["No clear scam signals, but always confirm before paying."]


def _rule_hits(is_scam: bool) -> list[dict[str, Any]]:
    if not is_scam:
        return []
    return [{"rule": "otp_or_pin_request", "weight": "high"}]


def _red_flags(is_scam: bool) -> list[str]:
    if not is_scam:
        return []
    return ["asks_for_code", "creates_urgency"]


def _step_down(level: str) -> str:
    return {"High": "Medium", "Medium": "Low", "Low": "Low"}[level]


def _decision_reason(status: str) -> str:
    return {
        "confirmed_scam": "Clear fraud pattern; number added to watch.",
        "not_scam": "Genuine message on review.",
        "closed": "Resolved; no further action.",
        "escalated": "Escalated to provider for follow-up.",
    }[status]


def _note_body(index: int) -> str:
    return [
        "Triaged: matches a known OTP-harvest pattern.",
        "Cross-checked the number against recent reports.",
    ][index % 2]


# --------------------------------------------------------------------------- #
# Validation (runs in both dry-run and live mode)
# --------------------------------------------------------------------------- #
def _validate(
    scam_types: list[dict[str, Any]],
    samples: list[dict[str, Any]],
    tips: list[dict[str, Any]],
    safe_actions: list[dict[str, Any]],
    users: list[dict[str, Any]],
    checks: list[dict[str, Any]],
    cases: list[dict[str, Any]],
    valid_scam_ids: set[int],
) -> None:
    assert len(scam_types) == 6, f"expected 6 scam_types, got {len(scam_types)}"
    assert len(samples) == 6, f"expected 6 samples, got {len(samples)}"
    assert len(tips) == 2, f"expected 2 tips, got {len(tips)}"
    assert len(safe_actions) == 10, f"expected 10 safe_actions, got {len(safe_actions)}"
    assert len(users) == 3, f"expected 3 users, got {len(users)}"
    assert len(checks) == N_CHECKS, f"expected {N_CHECKS} checks, got {len(checks)}"
    assert len(cases) == N_CASES, f"expected {N_CASES} cases, got {len(cases)}"

    # Every case points at a distinct check.
    check_ids = {c["check_id"] for c in cases}
    assert len(check_ids) == len(cases), "cases must reference distinct checks"

    # final_level is only Low/Medium/High — never "safe".
    for c in checks:
        assert c["final_level"] in {"Low", "Medium", "High"}, c["final_level"]
        if c["scam_type_id"] is not None:
            assert c["scam_type_id"] in valid_scam_ids, c["scam_type_id"]

    # No full phone number / OTP survives masking in stored text.
    leak = re.compile(r"[0-9০-৯]{4,}")
    for c in checks:
        assert not leak.search(c["masked_text"]), "masked_text still contains digits"

    # All statuses are represented.
    present = {c["status"] for c in cases}
    assert present == set(CASE_STATUSES), f"missing case statuses: {present}"


# --------------------------------------------------------------------------- #
# Database writes
# --------------------------------------------------------------------------- #
async def _write(data: dict[str, list[dict[str, Any]]]) -> dict[str, int]:
    from app.db import dispose_engine, get_engine
    from sqlalchemy import text

    engine = get_engine()
    async with engine.begin() as conn:
        await _insert_scam_types(conn, text, data["scam_types"])
        await _insert_users(conn, text, data["users"])
        await _insert_samples(conn, text, data["samples"])
        await _insert_tips(conn, text, data["tips"])
        await _insert_safe_actions(conn, text, data["safe_actions"])
        await _insert_campaigns(conn, text, data["campaigns"])
        await _insert_numbers(conn, text, data["numbers"])
        await _insert_checks(conn, text, data["checks"])
        await _insert_check_numbers(conn, text, data["check_numbers"])
        await _insert_cases(conn, text, data["cases"])
        await _insert_case_notes(conn, text, data["case_notes"])
        await _insert_daily(conn, text, data["daily_aggregates"])

    counts = await _row_counts()
    await dispose_engine()
    return counts


async def _insert_scam_types(conn, text, rows):  # noqa: ANN001
    await conn.execute(
        text(
            "INSERT INTO scam_types (id, slug, name_en, name_bn) "
            "VALUES (:id, :slug, :name_en, :name_bn) "
            "ON CONFLICT (id) DO UPDATE SET "
            "slug = EXCLUDED.slug, name_en = EXCLUDED.name_en, "
            "name_bn = EXCLUDED.name_bn"
        ),
        rows,
    )


async def _insert_users(conn, text, rows):  # noqa: ANN001
    await conn.execute(
        text(
            "INSERT INTO users (id, email, password_hash, display_name, role, "
            "language, theme, email_verified_at, onboarding_completed_at, "
            "consent_at, is_active, created_at, updated_at) VALUES "
            "(:id, :email, :password_hash, :display_name, CAST(:role AS user_role), "
            ":language, :theme, :email_verified_at, :onboarding_completed_at, "
            ":consent_at, :is_active, :created_at, :updated_at) "
            "ON CONFLICT (email) DO UPDATE SET "
            "display_name = EXCLUDED.display_name, role = EXCLUDED.role, "
            "email_verified_at = EXCLUDED.email_verified_at, "
            "onboarding_completed_at = EXCLUDED.onboarding_completed_at, "
            "consent_at = EXCLUDED.consent_at, is_active = EXCLUDED.is_active, "
            "updated_at = EXCLUDED.updated_at"
        ),
        rows,
    )


async def _insert_samples(conn, text, rows):  # noqa: ANN001
    await conn.execute(
        text(
            "INSERT INTO samples (id, label_en, label_bn, body, language) "
            "VALUES (:id, :label_en, :label_bn, :body, :language) "
            "ON CONFLICT (id) DO UPDATE SET "
            "label_en = EXCLUDED.label_en, label_bn = EXCLUDED.label_bn, "
            "body = EXCLUDED.body, language = EXCLUDED.language"
        ),
        rows,
    )


async def _insert_tips(conn, text, rows):  # noqa: ANN001
    await conn.execute(
        text(
            "INSERT INTO tips (id, title_en, title_bn, body_en, body_bn, active_from) "
            "VALUES (:id, :title_en, :title_bn, :body_en, :body_bn, :active_from) "
            "ON CONFLICT (id) DO UPDATE SET "
            "title_en = EXCLUDED.title_en, title_bn = EXCLUDED.title_bn, "
            "body_en = EXCLUDED.body_en, body_bn = EXCLUDED.body_bn, "
            "active_from = EXCLUDED.active_from"
        ),
        rows,
    )


async def _insert_safe_actions(conn, text, rows):  # noqa: ANN001
    await conn.execute(
        text(
            "INSERT INTO safe_actions (id, label_en, label_bn, body_en, body_bn, "
            "context, min_level, provider, phone, source_url, verified_at, "
            "is_active, sort_order) VALUES "
            "(:id, :label_en, :label_bn, :body_en, :body_bn, :context, "
            "CAST(:min_level AS risk_level), :provider, :phone, :source_url, "
            ":verified_at, :is_active, :sort_order) "
            "ON CONFLICT (id) DO UPDATE SET "
            "label_en = EXCLUDED.label_en, label_bn = EXCLUDED.label_bn, "
            "body_en = EXCLUDED.body_en, body_bn = EXCLUDED.body_bn, "
            "context = EXCLUDED.context, min_level = EXCLUDED.min_level, "
            "provider = EXCLUDED.provider, phone = EXCLUDED.phone, "
            "source_url = EXCLUDED.source_url, verified_at = EXCLUDED.verified_at, "
            "is_active = EXCLUDED.is_active, sort_order = EXCLUDED.sort_order"
        ),
        rows,
    )


async def _insert_campaigns(conn, text, rows):  # noqa: ANN001
    await conn.execute(
        text(
            "INSERT INTO campaigns (id, label, scam_type_id, member_count, count_7d, "
            "prev_count_7d, is_surging, first_seen_at, last_seen_at, updated_at) "
            "VALUES (:id, :label, :scam_type_id, :member_count, :count_7d, "
            ":prev_count_7d, :is_surging, :first_seen_at, :last_seen_at, :updated_at) "
            "ON CONFLICT (id) DO UPDATE SET "
            "label = EXCLUDED.label, scam_type_id = EXCLUDED.scam_type_id, "
            "member_count = EXCLUDED.member_count, count_7d = EXCLUDED.count_7d, "
            "prev_count_7d = EXCLUDED.prev_count_7d, is_surging = EXCLUDED.is_surging, "
            "first_seen_at = EXCLUDED.first_seen_at, "
            "last_seen_at = EXCLUDED.last_seen_at, updated_at = EXCLUDED.updated_at"
        ),
        rows,
    )


async def _insert_numbers(conn, text, rows):  # noqa: ANN001
    payload = [
        {k: v for k, v in row.items() if k != "number"} for row in rows
    ]  # never send the raw number to the database
    await conn.execute(
        text(
            "INSERT INTO risky_numbers (id, number_hmac, masked_display, "
            "check_count, report_count, high_count, status, first_seen_at, "
            "last_seen_at) VALUES (:id, :number_hmac, :masked_display, "
            ":check_count, :report_count, :high_count, "
            "CAST(:status AS number_status), :first_seen_at, :last_seen_at) "
            "ON CONFLICT (number_hmac) DO UPDATE SET "
            "masked_display = EXCLUDED.masked_display, "
            "check_count = EXCLUDED.check_count, "
            "report_count = EXCLUDED.report_count, "
            "high_count = EXCLUDED.high_count, status = EXCLUDED.status, "
            "first_seen_at = EXCLUDED.first_seen_at, "
            "last_seen_at = EXCLUDED.last_seen_at"
        ),
        payload,
    )


async def _insert_checks(conn, text, rows):  # noqa: ANN001
    payload = []
    for r in rows:
        payload.append(
            {
                **r,
                "extracted": json.dumps(r["extracted"]),
                "rule_hits": json.dumps(r["rule_hits"]),
                "reasons": json.dumps(r["reasons"]),
                "red_flags": json.dumps(r["red_flags"]),
                "highlights": json.dumps(r["highlights"]),
                "safe_action_ids": pg_text_array(r["safe_action_ids"]),
            }
        )
    await conn.execute(
        text(
            "INSERT INTO checks (id, user_id, guest_hash, kind, masked_text, "
            "text_hash, trimmed, detected_lang, response_lang, claimed_sender, "
            "amount_bdt, recipient_status, request_channel, rushed, provider, "
            "local_hour, extracted, rule_hits, rule_level, llm_level, model_prob, "
            "final_level, reasons, red_flags, highlights, safe_action_ids, "
            "scam_type_id, route, is_fallback, prompt_version, model_name, "
            "risk_model_version, input_tokens, output_tokens, latency_ms, "
            "created_at) VALUES "
            "(:id, :user_id, :guest_hash, CAST(:kind AS check_kind), :masked_text, "
            ":text_hash, :trimmed, :detected_lang, :response_lang, :claimed_sender, "
            ":amount_bdt, :recipient_status, :request_channel, :rushed, :provider, "
            ":local_hour, CAST(:extracted AS jsonb), CAST(:rule_hits AS jsonb), "
            "CAST(:rule_level AS risk_level), CAST(:llm_level AS risk_level), "
            ":model_prob, CAST(:final_level AS risk_level), "
            "CAST(:reasons AS jsonb), CAST(:red_flags AS jsonb), "
            "CAST(:highlights AS jsonb), CAST(:safe_action_ids AS text[]), "
            ":scam_type_id, CAST(:route AS check_route), :is_fallback, "
            ":prompt_version, :model_name, :risk_model_version, :input_tokens, "
            ":output_tokens, :latency_ms, :created_at) "
            "ON CONFLICT (id) DO NOTHING"
        ),
        payload,
    )


async def _insert_check_numbers(conn, text, rows):  # noqa: ANN001
    payload = [
        {"check_id": r["check_id"], "number_id": r["number_id"], "role": r["role"]}
        for r in rows
    ]
    if not payload:
        return
    await conn.execute(
        text(
            "INSERT INTO check_numbers (check_id, number_id, role) "
            "VALUES (:check_id, :number_id, :role) "
            "ON CONFLICT (check_id, number_id, role) DO NOTHING"
        ),
        payload,
    )


async def _insert_cases(conn, text, rows):  # noqa: ANN001
    payload = [{k: v for k, v in r.items() if not k.startswith("_")} for r in rows]
    await conn.execute(
        text(
            "INSERT INTO cases (id, check_id, status, assigned_to, reporter_note, "
            "reporter_consent_at, scam_type_id, campaign_id, decided_by, "
            "decided_at, decision_reason, version, created_at, updated_at) VALUES "
            "(:id, :check_id, CAST(:status AS case_status), :assigned_to, "
            ":reporter_note, :reporter_consent_at, :scam_type_id, :campaign_id, "
            ":decided_by, :decided_at, :decision_reason, :version, :created_at, "
            ":updated_at) ON CONFLICT (id) DO NOTHING"
        ),
        payload,
    )


async def _insert_case_notes(conn, text, rows):  # noqa: ANN001
    if not rows:
        return
    await conn.execute(
        text(
            "INSERT INTO case_notes (id, case_id, author_id, body, created_at) "
            "VALUES (:id, :case_id, :author_id, :body, :created_at) "
            "ON CONFLICT (id) DO NOTHING"
        ),
        rows,
    )


async def _insert_daily(conn, text, rows):  # noqa: ANN001
    if not rows:
        return
    await conn.execute(
        text(
            "INSERT INTO daily_aggregates (day, risk_level, scam_type_id, "
            "check_count, case_count, decided_count, agreed_count) VALUES "
            "(:day, CAST(:risk_level AS risk_level), :scam_type_id, :check_count, "
            ":case_count, :decided_count, :agreed_count) "
            "ON CONFLICT (day, risk_level, scam_type_id) DO UPDATE SET "
            "check_count = EXCLUDED.check_count, case_count = EXCLUDED.case_count, "
            "decided_count = EXCLUDED.decided_count, "
            "agreed_count = EXCLUDED.agreed_count"
        ),
        rows,
    )


_COUNT_TABLES = [
    "scam_types",
    "safe_actions",
    "samples",
    "tips",
    "users",
    "campaigns",
    "risky_numbers",
    "checks",
    "check_numbers",
    "cases",
    "case_notes",
    "daily_aggregates",
]


async def _row_counts() -> dict[str, int]:
    from app.db import get_sessionmaker
    from sqlalchemy import text

    counts: dict[str, int] = {}
    async with get_sessionmaker()() as session:
        for table in _COUNT_TABLES:
            result = await session.execute(text(f"SELECT count(*) FROM {table}"))
            counts[table] = int(result.scalar_one())
    return counts


# --------------------------------------------------------------------------- #
# Entrypoint
# --------------------------------------------------------------------------- #
def _print_warnings(safe_actions: list[dict[str, Any]]) -> None:
    unverified = [
        a for a in safe_actions if a.get("provider") and not a.get("is_active")
    ]
    if unverified:
        print("\n  WARNING — unverified provider safe actions (left inactive):")
        for a in unverified:
            phone = a.get("phone") or "no number"
            print(
                f"    - {a['provider']}: {phone} — verify on the provider's "
                "official site, then set is_active + verified_at."
            )


def _print_counts(title: str, counts: dict[str, int]) -> None:
    print(f"\n{title}")
    for table, n in counts.items():
        print(f"  {table:<18} {n}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Seed Prohori simulated data.")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Build and validate every row without touching the database.",
    )
    args = parser.parse_args()

    if args.dry_run:
        hmac_key = os.environ.get("NUMBER_HMAC_KEY", "dry-run-hmac-key")
        data = build_dataset(hmac_key, dry_run=True)
        built = {name: len(rows) for name, rows in data.items()}
        _print_counts("Dry run — built rows (no database written):", built)
        _print_warnings(data["safe_actions"])
        print("\n  Validation passed. No database changes were made.")
        return 0

    from app.config import get_settings

    settings = get_settings()
    data = build_dataset(settings.number_hmac_key, dry_run=False)
    _print_warnings(data["safe_actions"])
    counts = asyncio.run(_write(data))
    _print_counts("Seed complete — row counts:", counts)
    print(f"\n  All simulated rows tagged '{SEED_TAG}'. Re-running is idempotent.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
