"""Check domain service (Doc 02 Sections 4, 9, 10).

Connects check requests to the deterministic pipeline, payment model,
Claude integration, and database persistence. Enforces ownership and
idempotent reporting in single transactions.
"""

from __future__ import annotations

import hashlib
import hmac
from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import get_settings
from app.errors import AppError
from app.models.check import Case, Check, CheckNumber, RiskyNumber, ScamType
from app.models.knowledge import SafeAction
from app.models.user import User
from app.pipeline.fusion import fuse_risk
from app.pipeline.masking import mask_text
from app.pipeline.normalize import (
    guess_language_script,
    normalize_phone_number,
)
from app.pipeline.orchestrator import CAUTION_TEXTS, PipelineOrchestrator
from app.pipeline.riskmodel import PaymentInput, PaymentRiskModel
from app.schemas.checks import (
    CheckHistoryItem,
    CheckHistoryResponse,
    CheckPaymentRequest,
    CheckResultResponse,
    EvidenceItem,
    HighlightItem,
    SafeActionItem,
    ScamTypeSummary,
)


def _now() -> datetime:
    return datetime.now(UTC)


_orchestrator = PipelineOrchestrator()
_payment_model = PaymentRiskModel()


async def get_or_create_number(
    session: AsyncSession,
    *,
    normalized_number: str,
    hmac_key: str,
    is_high: bool = False,
) -> RiskyNumber:
    h = hmac.new(
        hmac_key.encode("utf-8"),
        normalized_number.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    if len(normalized_number) <= 7:
        masked = normalized_number[:2] + "•" * max(0, len(normalized_number) - 2)
    else:
        masked = (
            normalized_number[:5]
            + "•" * (len(normalized_number) - 7)
            + normalized_number[-2:]
        )

    stmt = select(RiskyNumber).where(RiskyNumber.number_hmac == h)
    res = await session.execute(stmt)
    num = res.scalar_one_or_none()
    now_dt = _now()
    if num is None:
        num = RiskyNumber(
            number_hmac=h,
            masked_display=masked,
            check_count=1,
            report_count=0,
            high_count=1 if is_high else 0,
            status="watch",
            first_seen_at=now_dt,
            last_seen_at=now_dt,
        )
        session.add(num)
        await session.flush()
    else:
        num.check_count += 1
        if is_high:
            num.high_count += 1
        num.last_seen_at = now_dt
        await session.flush()
    return num


async def resolve_safe_actions_with_db(
    session: AsyncSession,
    action_ids: list[str],
    language: str,
    provider: str | None = None,
) -> list[SafeActionItem]:
    is_bn = language == "bn"
    items: list[SafeActionItem] = []

    # Check if a provider-specific helpline exists
    provider_helpline_added = False
    chosen_provider = provider.lower() if provider else None

    # Query safe_actions from DB
    stmt = select(SafeAction).where(SafeAction.is_active == True)  # noqa: E712
    res = await session.execute(stmt)
    db_actions = {a.id: a for a in res.scalars().all()}

    # If DB has no actions, fallback to safe_actions.json seed
    if not db_actions:
        from app.api.v1.public import _load_seed_json

        for item in _load_seed_json("safe_actions.json"):
            if item.get("is_active", True):
                db_actions[item["id"]] = type("ActionHolder", (), item)()

    # If provider is given and has a verified helpline in db
    if chosen_provider:
        for a in db_actions.values():
            if a.provider == chosen_provider and a.phone:
                items.append(
                    SafeActionItem(
                        id=a.id,
                        label=a.label_bn if is_bn else a.label_en,
                        body=a.body_bn if is_bn else a.body_en,
                        phone=a.phone,
                    )
                )
                provider_helpline_added = True
                break

    for raw_id in action_ids:
        if raw_id == "call_provider_helpline" and provider_helpline_added:
            continue
        if raw_id in db_actions:
            a = db_actions[raw_id]
            items.append(
                SafeActionItem(
                    id=a.id,
                    label=a.label_bn if is_bn else a.label_en,
                    body=a.body_bn if is_bn else a.body_en,
                    phone=a.phone,
                )
            )
        else:
            # Fallback item
            items.append(
                SafeActionItem(
                    id=raw_id,
                    label="পদক্ষেপ নিন" if is_bn else "Take action",
                    body=None,
                    phone=None,
                )
            )
    return items


async def run_message_check(
    session: AsyncSession,
    *,
    text: str,
    claimed_sender: str | None = None,
    language_hint: str | None = None,
    user_id: UUID | None = None,
    guest_hash: str | None = None,
    api_key_id: UUID | None = None,
) -> CheckResultResponse:
    settings = get_settings()
    now_dt = _now()

    # Run check orchestrator
    check_result = _orchestrator.run_check(
        raw_text=text,
        payment_context={"claimed_sender": claimed_sender} if claimed_sender else None,
    )

    final_level = check_result.get("risk_level")
    masked_text = check_result.get("masked_text") or text
    reasons = check_result.get("reasons") or []
    red_flag_items = check_result.get("red_flags") or []
    red_flags_list = [
        rf["flag"] if isinstance(rf, dict) else str(rf) for rf in red_flag_items
    ]
    safe_action_ids = check_result.get("safe_action_ids") or []
    caution = check_result.get("caution") or ""
    scam_type_slug = check_result.get("scam_type")
    pattern_codes = check_result.get("pattern_codes") or []
    telemetry = check_result.get("telemetry") or {}
    is_fallback = check_result.get("fallback_active", False)
    trimmed = check_result.get("trimmed", False)

    detected_lang = guess_language_script(text)
    response_lang = language_hint or ("en" if detected_lang == "latin" else "bn")

    # Build highlights with character spans
    highlights: list[HighlightItem] = []
    for rf in red_flag_items:
        if isinstance(rf, dict) and rf.get("quote"):
            quote = rf["quote"]
            start = masked_text.find(quote)
            if start != -1:
                highlights.append(
                    HighlightItem(
                        quote=quote,
                        flag=rf.get("flag", "suspicious"),
                        start=start,
                        end=start + len(quote),
                    )
                )

    # Resolve safe actions with provider awareness
    safe_actions = await resolve_safe_actions_with_db(
        session, safe_action_ids, response_lang, claimed_sender
    )

    # Lookup scam type
    scam_type_obj = None
    scam_type_id = None
    if scam_type_slug and scam_type_slug != "none":
        st_res = await session.execute(
            select(ScamType).where(ScamType.slug == scam_type_slug)
        )
        scam_type_obj = st_res.scalar_one_or_none()
        if scam_type_obj:
            scam_type_id = scam_type_obj.id

    evidence = [
        EvidenceItem(code=code, title=f"Scam Pattern {code}") for code in pattern_codes
    ]

    text_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()

    # Create Check record
    check = Check(
        user_id=user_id,
        guest_hash=guest_hash,
        api_key_id=api_key_id,
        kind="message",
        masked_text=masked_text,
        text_hash=text_hash,
        trimmed=trimmed,
        detected_lang=detected_lang,
        response_lang=response_lang,
        claimed_sender=claimed_sender,
        amount_bdt=None,
        extracted={},
        rule_hits=red_flags_list,
        final_level=final_level,
        reasons=reasons,
        red_flags=red_flags_list,
        highlights=[h.model_dump() for h in highlights],
        safe_action_ids=safe_action_ids,
        scam_type_id=scam_type_id,
        route=telemetry.get("route") or "rules_only",
        is_fallback=is_fallback,
        prompt_version="p1_p2_v1",
        model_name=telemetry.get("model"),
        latency_ms=int(telemetry.get("latency_ms", 0)),
        created_at=now_dt,
    )
    session.add(check)
    await session.flush()

    # Mask and record any phone numbers detected in text
    mask_res = mask_text(text, hmac_key=settings.number_hmac_key)
    for p in mask_res.phone_numbers:
        stmt = select(RiskyNumber).where(RiskyNumber.number_hmac == p.hmac_hash)
        res = await session.execute(stmt)
        rnum = res.scalar_one_or_none()
        if rnum is None:
            rnum = RiskyNumber(
                number_hmac=p.hmac_hash,
                masked_display=p.masked_display,
                check_count=1,
                report_count=0,
                high_count=1 if final_level == "High" else 0,
                status="watch",
                first_seen_at=now_dt,
                last_seen_at=now_dt,
            )
            session.add(rnum)
            await session.flush()
        else:
            rnum.check_count += 1
            if final_level == "High":
                rnum.high_count += 1
            rnum.last_seen_at = now_dt
            await session.flush()

        cn = CheckNumber(check_id=check.id, number_id=rnum.id, role="mentioned")
        session.add(cn)

    await session.flush()

    scam_summary = None
    if scam_type_obj:
        name = scam_type_obj.name_bn if response_lang == "bn" else scam_type_obj.name_en
        scam_summary = ScamTypeSummary(slug=scam_type_obj.slug, name=name)

    return CheckResultResponse(
        id=check.id,
        final_level=final_level,
        response_language=response_lang,
        reasons=reasons,
        red_flags=red_flags_list,
        highlights=highlights,
        safe_actions=safe_actions,
        caution=caution,
        scam_type=scam_summary,
        evidence=evidence,
        masked_text=masked_text,
        is_fallback=is_fallback,
        trimmed=trimmed,
        has_reported=False,
        report_reference=None,
        created_at=now_dt,
    )


async def run_payment_check(
    session: AsyncSession,
    *,
    req: CheckPaymentRequest,
    user_id: UUID | None = None,
    guest_hash: str | None = None,
    api_key_id: UUID | None = None,
) -> CheckResultResponse:
    settings = get_settings()
    now_dt = _now()
    response_lang = "bn"

    # Normalize recipient number if given
    norm_recipient = None
    has_hard_rule = False
    if req.recipient_number:
        norm_recipient = normalize_phone_number(req.recipient_number)
        if norm_recipient:
            h = hmac.new(
                settings.number_hmac_key.encode("utf-8"),
                norm_recipient.encode("utf-8"),
                hashlib.sha256,
            ).hexdigest()
            q = select(RiskyNumber).where(RiskyNumber.number_hmac == h)
            rn = (await session.execute(q)).scalar_one_or_none()
            if rn and rn.status == "confirmed_risky":
                has_hard_rule = True

    status_map = {"known": "known", "new": "new", "not_sure": "suspicious"}
    rec_status = status_map.get(req.recipient_status, "new")

    chan_map = {
        "phone_call": "ussd",
        "sms": "sms_link",
        "whatsapp": "web",
        "in_person": "agent",
        "online_shop": "web",
        "other": "app",
    }
    chan = chan_map.get(req.request_channel, "app")
    urgency = 1 if req.rushed == "yes" else 0
    hour = req.local_hour if req.local_hour is not None else now_dt.hour

    pay_input = PaymentInput.from_values(
        amount=req.amount_bdt,
        recipient_status=rec_status,
        channel=chan,
        urgency=urgency,
        hour=hour,
    )
    model_res = _payment_model.predict(pay_input)

    # Fusion
    fusion_out = fuse_risk(
        has_hard_rule=has_hard_rule,
        soft_rule_count=1 if urgency == 1 else 0,
        llm_level=None,
        payment_score=model_res.probability,
        is_message_check=False,
    )
    final_level = fusion_out.final_level

    reasons: list[str] = []
    if has_hard_rule:
        reasons.append(
            "প্রাপক নম্বরটি এর আগে প্রতারণামূলক হিসেবে চিহ্নিত করা হয়েছে।"
            if response_lang == "bn"
            else "The recipient number was previously confirmed as fraudulent."
        )
    for factor in model_res.top_factors:
        desc = factor.description_bn if response_lang == "bn" else factor.description_en
        reasons.append(desc)

    if not reasons:
        reasons.append(
            "লেনদেনের প্যারামিটারে কোনো অস্বাভাবিক সংকেত পাওয়া যায়নি।"
            if response_lang == "bn"
            else "No unusual patterns detected in the payment parameters."
        )

    # Safe actions
    action_ids = ["do_not_send", "confirm_another_way", "check_in_official_app"]
    if req.provider or final_level in ("High", "Medium"):
        action_ids.insert(0, "call_provider_helpline")

    safe_actions = await resolve_safe_actions_with_db(
        session, action_ids, response_lang, req.provider
    )
    caution = CAUTION_TEXTS.get(final_level or "Low", {}).get(
        response_lang, CAUTION_TEXTS["Low"]["bn"]
    )

    check = Check(
        user_id=user_id,
        guest_hash=guest_hash,
        api_key_id=api_key_id,
        kind="payment",
        amount_bdt=req.amount_bdt,
        recipient_status=req.recipient_status,
        request_channel=req.request_channel,
        rushed=req.rushed,
        provider=req.provider,
        local_hour=hour,
        model_prob=Decimal(str(model_res.probability)),
        final_level=final_level,
        reasons=reasons,
        red_flags=[f.feature for f in model_res.top_factors],
        safe_action_ids=action_ids,
        route="payment_model",
        is_fallback=False,
        risk_model_version=model_res.model_version,
        created_at=now_dt,
    )
    session.add(check)
    await session.flush()

    if norm_recipient:
        rnum = await get_or_create_number(
            session,
            normalized_number=norm_recipient,
            hmac_key=settings.number_hmac_key,
            is_high=final_level == "High",
        )
        cn = CheckNumber(check_id=check.id, number_id=rnum.id, role="recipient")
        session.add(cn)
        await session.flush()

    return CheckResultResponse(
        id=check.id,
        final_level=final_level,
        response_language=response_lang,
        reasons=reasons,
        red_flags=[f.feature for f in model_res.top_factors],
        highlights=[],
        safe_actions=safe_actions,
        caution=caution,
        scam_type=None,
        evidence=[],
        masked_text=None,
        is_fallback=False,
        trimmed=False,
        has_reported=False,
        report_reference=None,
        created_at=now_dt,
    )


async def get_check_by_id(
    session: AsyncSession,
    check_id: UUID,
    *,
    user: User | None = None,
    guest_hash: str | None = None,
) -> CheckResultResponse | None:
    stmt = (
        select(Check)
        .where(Check.id == check_id, Check.deleted_at.is_(None))
        .options(selectinload(Check.scam_type))
    )
    check = (await session.execute(stmt)).scalar_one_or_none()
    if not check:
        return None

    # Ownership enforcement:
    is_reviewer = user and user.role in ("reviewer", "admin")
    is_owner = (user and check.user_id == user.id) or (
        guest_hash and check.guest_hash == guest_hash
    )
    if not (is_reviewer or is_owner):
        return None

    # Check if a case was reported
    case_stmt = select(Case).where(Case.check_id == check.id)
    case_obj = (await session.execute(case_stmt)).scalar_one_or_none()

    provider = check.provider or check.claimed_sender
    safe_actions = await resolve_safe_actions_with_db(
        session, check.safe_action_ids, check.response_lang, provider
    )
    caution = CAUTION_TEXTS.get(check.final_level or "fallback", {}).get(
        check.response_lang, CAUTION_TEXTS["Low"]["bn"]
    )

    highlights = [
        HighlightItem(**h) if isinstance(h, dict) else h
        for h in (check.highlights or [])
    ]

    return CheckResultResponse(
        id=check.id,
        final_level=check.final_level,
        response_language=check.response_lang,
        reasons=check.reasons or [],
        red_flags=check.red_flags or [],
        highlights=highlights,
        safe_actions=safe_actions,
        caution=caution,
        scam_type=(
            ScamTypeSummary(
                slug=check.scam_type.slug,
                name=(
                    check.scam_type.name_bn
                    if check.response_lang == "bn"
                    else check.scam_type.name_en
                ),
            )
            if check.scam_type
            else None
        ),
        evidence=[],
        masked_text=check.masked_text,
        is_fallback=check.is_fallback,
        trimmed=check.trimmed,
        has_reported=case_obj is not None,
        report_reference=case_obj.reference if case_obj else None,
        created_at=check.created_at,
    )


async def list_user_checks(
    session: AsyncSession,
    user_id: UUID,
    *,
    level: str | None = None,
    kind: str | None = None,
    limit: int = 20,
) -> CheckHistoryResponse:
    stmt = (
        select(Check)
        .where(Check.user_id == user_id, Check.deleted_at.is_(None))
        .options(selectinload(Check.scam_type))
        .order_by(Check.created_at.desc())
        .limit(limit)
    )
    if level:
        stmt = stmt.where(Check.final_level == level)
    if kind:
        stmt = stmt.where(Check.kind == kind)

    res = await session.execute(stmt)
    checks = res.scalars().all()

    check_ids = [c.id for c in checks]
    case_map: dict[UUID, str] = {}
    if check_ids:
        c_stmt = select(Case).where(Case.check_id.in_(check_ids))
        for c in (await session.execute(c_stmt)).scalars().all():
            case_map[c.check_id] = c.reference

    items: list[CheckHistoryItem] = []
    for c in checks:
        ref = case_map.get(c.id)
        items.append(
            CheckHistoryItem(
                id=c.id,
                kind=c.kind,
                final_level=c.final_level,
                masked_text=c.masked_text,
                amount_bdt=c.amount_bdt,
                scam_type=(
                    ScamTypeSummary(slug=c.scam_type.slug, name=c.scam_type.name_bn)
                    if c.scam_type
                    else None
                ),
                has_reported=ref is not None,
                report_reference=ref,
                created_at=c.created_at,
            )
        )

    count_stmt = select(func.count(Check.id)).where(
        Check.user_id == user_id, Check.deleted_at.is_(None)
    )
    total = (await session.execute(count_stmt)).scalar() or len(items)

    return CheckHistoryResponse(items=items, total=total)


async def delete_user_check(
    session: AsyncSession, check_id: UUID, user_id: UUID
) -> None:
    stmt = select(Check).where(
        Check.id == check_id, Check.user_id == user_id, Check.deleted_at.is_(None)
    )
    check = (await session.execute(stmt)).scalar_one_or_none()
    if not check:
        raise AppError("not_found", status=404, message_key="errors.not_found")

    # If case exists -> 409
    case_stmt = select(Case).where(Case.check_id == check.id)
    case_obj = (await session.execute(case_stmt)).scalar_one_or_none()
    if case_obj:
        raise AppError(
            "cannot_delete_reported_check",
            status=409,
            message_key="errors.cannot_delete_reported_check",
        )

    check.deleted_at = _now()
    await session.flush()


async def report_check(
    session: AsyncSession,
    check_id: UUID,
    *,
    consent: bool,
    note: str | None = None,
    user: User | None = None,
    guest_hash: str | None = None,
) -> str:
    if not consent:
        raise AppError(
            "consent_required",
            status=422,
            message_key="errors.consent_required",
            fields={"consent": ["Consent is required to report"]},
        )

    stmt = select(Check).where(Check.id == check_id, Check.deleted_at.is_(None))
    check = (await session.execute(stmt)).scalar_one_or_none()
    if not check:
        raise AppError("not_found", status=404, message_key="errors.not_found")

    # Ownership check
    is_owner = (user and check.user_id == user.id) or (
        guest_hash and check.guest_hash == guest_hash
    )
    if not is_owner:
        raise AppError("not_found", status=404, message_key="errors.not_found")

    # Idempotency check: if case already exists, return same reference
    case_stmt = select(Case).where(Case.check_id == check.id)
    existing_case = (await session.execute(case_stmt)).scalar_one_or_none()
    if existing_case:
        return existing_case.reference

    # Create new case
    count_stmt = select(func.count(Case.id))
    current_count = (await session.execute(count_stmt)).scalar() or 0
    ref = f"PRO-{current_count + 1:06d}"

    case_obj = Case(
        reference=ref,
        check_id=check.id,
        reporter_note=note,
        reporter_consent_at=_now(),
        scam_type_id=check.scam_type_id,
        status="new",
    )
    session.add(case_obj)

    # In the same transaction, update risky_numbers report_count
    num_stmt = select(CheckNumber).where(CheckNumber.check_id == check.id)
    links = (await session.execute(num_stmt)).scalars().all()
    for link in links:
        n_stmt = select(RiskyNumber).where(RiskyNumber.id == link.number_id)
        rnum = (await session.execute(n_stmt)).scalar_one_or_none()
        if rnum:
            rnum.report_count += 1

    await session.flush()
    return ref
