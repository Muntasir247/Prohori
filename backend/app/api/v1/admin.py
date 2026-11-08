"""Admin endpoints (Doc 01 S30-S35, Doc 02 Section 9, F15, F24, F29, F30).

Guarded by require_role('admin').
Provides management for:
- Knowledge base: list, create, edit, publish (chunks + embeds).
- Safe actions: CRUD with unverified helpline rejection and 90-day warning.
- Quality: eval_runs, checks route & token & cache metrics, prompt activation gate.
- Users: invites (48h single-use), role changes, deactivation, protect last admin.
- API keys: test/live keys, SHA-256 only, shown once, revoke, rate limits, scopes.
- Audit log: read-only list with before & after diff.
"""

from __future__ import annotations

import hashlib
import re
import secrets
from datetime import UTC, date, datetime, time, timedelta
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy import delete, desc, func, select
from sqlalchemy.orm import selectinload

from app.api.deps import DbSession, require_role
from app.config import get_settings
from app.errors import AppError
from app.models.api_key import ApiKey
from app.models.audit import AuditEvent
from app.models.auth_token import AuthToken, TokenPurpose
from app.models.base import utcnow
from app.models.check import Check, ScamType
from app.models.eval import EvalRun, PromptVersion
from app.models.knowledge import KbChunk, KbDocument, SafeAction
from app.models.session import Session
from app.models.user import User
from app.pipeline.retrieval import compute_deterministic_vector
from app.schemas.admin import (
    AdminInviteIn,
    AdminInviteOut,
    AdminUserOut,
    AdminUserUpdateIn,
    ApiKeyCreateIn,
    ApiKeyCreateOut,
    ApiKeyOut,
    AuditEventOut,
    AuditLogResponse,
    EvalRunOut,
    KbChunkOut,
    KbDocumentCreate,
    KbDocumentDetailOut,
    KbDocumentOut,
    KbDocumentUpdate,
    KbPublishResponse,
    PromptVersionOut,
    QualityMetricsResponse,
    RouteMixItem,
    SafeActionAdminOut,
    SafeActionCreate,
    SafeActionUpdate,
)
from app.security.tokens import hash_token, new_token
from app.services.email import EmailService

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(require_role("admin"))],
)
AdminUser = Annotated[User, Depends(require_role("admin"))]


def _chunk_document(
    text: str, target_tokens: int = 300, overlap_tokens: int = 40
) -> list[str]:
    """Segment document text into chunks of 200-400 tokens with overlap."""
    sentences = re.split(r"(?<=[।!?\.\n])\s+", text.strip())
    sentences = [s.strip() for s in sentences if s.strip()]
    if not sentences:
        return [text.strip()] if text.strip() else []

    chunks: list[str] = []
    current_sentences: list[str] = []
    current_tokens = 0

    for sent in sentences:
        words = re.findall(r"\S+", sent)
        sent_tokens = max(1, int(len(words) * 1.3))
        if current_tokens + sent_tokens > target_tokens and current_sentences:
            chunks.append(" ".join(current_sentences))
            # overlap
            overlap_sentences: list[str] = []
            overlap_count = 0
            for s in reversed(current_sentences):
                s_tok = max(1, int(len(re.findall(r"\S+", s)) * 1.3))
                if overlap_count + s_tok <= overlap_tokens or not overlap_sentences:
                    overlap_sentences.insert(0, s)
                    overlap_count += s_tok
                else:
                    break
            current_sentences = overlap_sentences
            current_tokens = overlap_count

        current_sentences.append(sent)
        current_tokens += sent_tokens

    if current_sentences:
        chunks.append(" ".join(current_sentences))

    return chunks


# ===========================================================================
# 1. Knowledge Base
# ===========================================================================


@router.get("/knowledge", response_model=list[KbDocumentOut])
async def list_kb_documents(
    session: DbSession,
    status: str | None = Query(None),
    scam_type_id: int | None = Query(None),
    language: str | None = Query(None),
    q: str | None = Query(None),
) -> list[KbDocumentOut]:
    query = (
        select(KbDocument, ScamType, func.count(KbChunk.id).label("chunk_count"))
        .outerjoin(ScamType, KbDocument.scam_type_id == ScamType.id)
        .outerjoin(KbChunk, KbDocument.id == KbChunk.document_id)
        .group_by(KbDocument.id, ScamType.id)
        .order_by(desc(KbDocument.updated_at))
    )

    if status and status != "all":
        query = query.where(KbDocument.status == status)
    if scam_type_id:
        query = query.where(KbDocument.scam_type_id == scam_type_id)
    if language:
        query = query.where(KbDocument.language == language)
    if q:
        query = query.where(
            (KbDocument.title.ilike(f"%{q}%"))
            | (KbDocument.code.ilike(f"%{q}%"))
            | (KbDocument.body.ilike(f"%{q}%"))
        )

    rows = (await session.execute(query)).all()
    out = []
    for doc, st, chunk_count in rows:
        out.append(
            KbDocumentOut(
                id=doc.id,
                code=doc.code,
                title=doc.title,
                scam_type_id=doc.scam_type_id,
                scam_type_slug=st.slug if st else None,
                scam_type_name=st.name_en if st else None,
                language=doc.language,
                source_url=doc.source_url,
                body=doc.body,
                status=doc.status,
                created_at=doc.created_at,
                updated_at=doc.updated_at,
                chunk_count=chunk_count or 0,
            )
        )
    return out


@router.get("/knowledge/{id}", response_model=KbDocumentDetailOut)
async def get_kb_document(id: UUID, session: DbSession) -> KbDocumentDetailOut:
    stmt = (
        select(KbDocument)
        .options(selectinload(KbDocument.chunks))
        .where(KbDocument.id == id)
    )
    doc = (await session.execute(stmt)).scalar_one_or_none()
    if not doc:
        raise AppError("not_found", status=404, message_key="errors.not_found")

    st = (
        await session.execute(select(ScamType).where(ScamType.id == doc.scam_type_id))
    ).scalar_one_or_none()
    chunks_out = [
        KbChunkOut(
            id=c.id,
            chunk_index=c.chunk_index,
            content=c.content,
            token_count=c.token_count,
        )
        for c in sorted(doc.chunks, key=lambda x: x.chunk_index)
    ]

    return KbDocumentDetailOut(
        id=doc.id,
        code=doc.code,
        title=doc.title,
        scam_type_id=doc.scam_type_id,
        scam_type_slug=st.slug if st else None,
        scam_type_name=st.name_en if st else None,
        language=doc.language,
        source_url=doc.source_url,
        body=doc.body,
        status=doc.status,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
        chunk_count=len(chunks_out),
        chunks=chunks_out,
    )


@router.post(
    "/knowledge", response_model=KbDocumentOut, status_code=status.HTTP_201_CREATED
)
async def create_kb_document(
    body: KbDocumentCreate,
    admin: AdminUser,
    session: DbSession,
) -> KbDocumentOut:
    # Check duplicate code
    existing = (
        await session.execute(select(KbDocument).where(KbDocument.code == body.code))
    ).scalar_one_or_none()
    if existing:
        raise AppError("conflict", status=409, message_key="errors.duplicate_code")

    doc = KbDocument(
        code=body.code,
        title=body.title,
        scam_type_id=body.scam_type_id,
        language=body.language,
        source_url=body.source_url,
        body=body.body,
        status="draft",
        created_by=admin.id,
    )
    session.add(doc)
    await session.flush()

    audit = AuditEvent(
        actor_id=admin.id,
        actor_role=admin.role,
        action="kb.create",
        entity_type="kb_document",
        entity_id=str(doc.id),
        before=None,
        after={"code": doc.code, "title": doc.title, "status": doc.status},
    )
    session.add(audit)
    await session.flush()

    st = (
        await session.execute(select(ScamType).where(ScamType.id == doc.scam_type_id))
    ).scalar_one_or_none()
    return KbDocumentOut(
        id=doc.id,
        code=doc.code,
        title=doc.title,
        scam_type_id=doc.scam_type_id,
        scam_type_slug=st.slug if st else None,
        scam_type_name=st.name_en if st else None,
        language=doc.language,
        source_url=doc.source_url,
        body=doc.body,
        status=doc.status,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
        chunk_count=0,
    )


@router.patch("/knowledge/{id}", response_model=KbDocumentOut)
async def update_kb_document(
    id: UUID,
    body: KbDocumentUpdate,
    admin: AdminUser,
    session: DbSession,
) -> KbDocumentOut:
    doc = (
        await session.execute(select(KbDocument).where(KbDocument.id == id))
    ).scalar_one_or_none()
    if not doc:
        raise AppError("not_found", status=404, message_key="errors.not_found")

    before = {"title": doc.title, "scam_type_id": doc.scam_type_id, "body": doc.body}

    if body.title is not None:
        doc.title = body.title
    if body.scam_type_id is not None:
        doc.scam_type_id = body.scam_type_id
    if body.language is not None:
        doc.language = body.language
    if body.source_url is not None:
        doc.source_url = body.source_url
    if body.body is not None:
        doc.body = body.body
        # Editing body resets status to draft until re-published
        doc.status = "draft"
    doc.updated_at = utcnow()

    audit = AuditEvent(
        actor_id=admin.id,
        actor_role=admin.role,
        action="kb.update",
        entity_type="kb_document",
        entity_id=str(doc.id),
        before=before,
        after={
            "title": doc.title,
            "scam_type_id": doc.scam_type_id,
            "status": doc.status,
        },
    )
    session.add(audit)
    await session.flush()

    st = (
        await session.execute(select(ScamType).where(ScamType.id == doc.scam_type_id))
    ).scalar_one_or_none()
    chunk_count = (
        await session.execute(
            select(func.count(KbChunk.id)).where(KbChunk.document_id == doc.id)
        )
    ).scalar_one() or 0

    return KbDocumentOut(
        id=doc.id,
        code=doc.code,
        title=doc.title,
        scam_type_id=doc.scam_type_id,
        scam_type_slug=st.slug if st else None,
        scam_type_name=st.name_en if st else None,
        language=doc.language,
        source_url=doc.source_url,
        body=doc.body,
        status=doc.status,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
        chunk_count=chunk_count,
    )


@router.post("/knowledge/{id}/publish", response_model=KbPublishResponse)
async def publish_kb_document(
    id: UUID,
    admin: AdminUser,
    session: DbSession,
) -> KbPublishResponse:
    doc = (
        await session.execute(select(KbDocument).where(KbDocument.id == id))
    ).scalar_one_or_none()
    if not doc:
        raise AppError("not_found", status=404, message_key="errors.not_found")

    # If body is empty, fail publish and leave in Draft with Retry
    if not doc.body or not doc.body.strip():
        doc.status = "draft"
        await session.flush()
        raise AppError(
            "validation_failed",
            status=422,
            message_key="errors.empty_document_body",
        )

    try:
        raw_chunks = _chunk_document(doc.body)
        if not raw_chunks:
            raise ValueError("No chunks created from document text")

        # Delete existing chunks for this document
        await session.execute(delete(KbChunk).where(KbChunk.document_id == doc.id))

        new_chunks = []
        chunk_records_for_joblib = []
        for idx, text_seg in enumerate(raw_chunks):
            words = re.findall(r"\S+", text_seg)
            tok_count = max(1, int(len(words) * 1.3))
            emb = compute_deterministic_vector(text_seg, 1024)

            chunk = KbChunk(
                document_id=doc.id,
                chunk_index=idx,
                content=text_seg,
                token_count=tok_count,
                embedding=emb,
                embedding_model="voyage-4",
            )
            session.add(chunk)
            new_chunks.append(chunk)

            chunk_records_for_joblib.append(
                {
                    "code": doc.code,
                    "document_code": doc.code,
                    "title": doc.title,
                    "content": text_seg,
                    "token_count": tok_count,
                    "chunk_index": idx,
                    "embedding": emb,
                    "embedding_model": "voyage-4",
                    "scam_type_id": doc.scam_type_id,
                }
            )

        doc.status = "published"
        doc.updated_at = utcnow()

        audit = AuditEvent(
            actor_id=admin.id,
            actor_role=admin.role,
            action="kb.publish",
            entity_type="kb_document",
            entity_id=str(doc.id),
            before={"status": "draft"},
            after={"status": "published", "chunks": len(new_chunks)},
        )
        session.add(audit)
        await session.flush()

        # Update disk cache & in-memory cache for RetrievalEngine
        try:
            import joblib

            from app.pipeline.retrieval import _CACHE_FILE

            all_chunks = []
            if _CACHE_FILE.exists():
                data = joblib.load(_CACHE_FILE)
                existing_list = data.get("chunks", [])
                all_chunks = [c for c in existing_list if c.get("code") != doc.code]

            all_chunks.extend(chunk_records_for_joblib)
            _CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
            joblib.dump({"chunks": all_chunks}, _CACHE_FILE)
        except Exception:
            pass

        return KbPublishResponse(
            ok=True,
            document_id=doc.id,
            chunks_published=len(new_chunks),
            status=doc.status,
        )

    except Exception:
        # Failure leaves document in Draft with Retry
        doc.status = "draft"
        await session.flush()
        raise AppError(
            "embedding_failed",
            status=500,
            message_key="errors.embedding_failed_retry",
        ) from None


# ===========================================================================
# 2. Safe Actions
# ===========================================================================


@router.get("/safe-actions", response_model=list[SafeActionAdminOut])
async def list_safe_actions_admin(session: DbSession) -> list[SafeActionAdminOut]:
    stmt = select(SafeAction).order_by(SafeAction.sort_order.asc(), SafeAction.id.asc())
    actions = (await session.execute(stmt)).scalars().all()

    today = date.today()
    out = []
    for a in actions:
        needs_reverification = False
        warning = None
        if a.phone and a.phone.strip():
            if not a.verified_at:
                needs_reverification = True
                warning = "Helpline has no verified date"
            elif (today - a.verified_at).days > 90:
                needs_reverification = True
                days_ago = (today - a.verified_at).days
                warning = f"Helpline not re-verified in {days_ago} days (>90d target)"

        out.append(
            SafeActionAdminOut(
                id=a.id,
                label_en=a.label_en,
                label_bn=a.label_bn,
                body_en=a.body_en,
                body_bn=a.body_bn,
                context=a.context,
                min_level=a.min_level,
                provider=a.provider,
                phone=a.phone,
                source_url=a.source_url,
                verified_at=a.verified_at,
                is_active=a.is_active,
                sort_order=a.sort_order,
                needs_reverification=needs_reverification,
                warning=warning,
            )
        )
    return out


@router.post(
    "/safe-actions",
    response_model=SafeActionAdminOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_safe_action_admin(
    body: SafeActionCreate,
    admin: AdminUser,
    session: DbSession,
) -> SafeActionAdminOut:
    # Constraint: phone cannot be active without source_url and verified_at
    has_phone = bool(body.phone and body.phone.strip())
    if body.is_active and has_phone:
        if not body.source_url or not body.verified_at:
            raise AppError(
                "unverified_helpline",
                status=422,
                message_key="errors.unverified_helpline",
            )

    existing = (
        await session.execute(select(SafeAction).where(SafeAction.id == body.id))
    ).scalar_one_or_none()
    if existing:
        raise AppError("conflict", status=409, message_key="errors.duplicate_id")

    action = SafeAction(
        id=body.id,
        label_en=body.label_en,
        label_bn=body.label_bn,
        body_en=body.body_en,
        body_bn=body.body_bn,
        context=body.context,
        min_level=body.min_level,
        provider=body.provider,
        phone=body.phone,
        source_url=body.source_url,
        verified_at=body.verified_at,
        is_active=body.is_active,
        sort_order=body.sort_order,
    )
    session.add(action)
    await session.flush()

    audit = AuditEvent(
        actor_id=admin.id,
        actor_role=admin.role,
        action="safe_action.create",
        entity_type="safe_action",
        entity_id=action.id,
        before=None,
        after={
            "id": action.id,
            "label_en": action.label_en,
            "is_active": action.is_active,
        },
    )
    session.add(audit)
    await session.flush()

    today = date.today()
    needs_reverification = bool(
        action.phone
        and (not action.verified_at or (today - action.verified_at).days > 90)
    )

    return SafeActionAdminOut(
        id=action.id,
        label_en=action.label_en,
        label_bn=action.label_bn,
        body_en=action.body_en,
        body_bn=action.body_bn,
        context=action.context,
        min_level=action.min_level,
        provider=action.provider,
        phone=action.phone,
        source_url=action.source_url,
        verified_at=action.verified_at,
        is_active=action.is_active,
        sort_order=action.sort_order,
        needs_reverification=needs_reverification,
        warning="Helpline not re-verified in 90 days" if needs_reverification else None,
    )


@router.patch("/safe-actions/{id}", response_model=SafeActionAdminOut)
async def update_safe_action_admin(
    id: str,
    body: SafeActionUpdate,
    admin: AdminUser,
    session: DbSession,
) -> SafeActionAdminOut:
    action = (
        await session.execute(select(SafeAction).where(SafeAction.id == id))
    ).scalar_one_or_none()
    if not action:
        raise AppError("not_found", status=404, message_key="errors.not_found")

    before = {
        "is_active": action.is_active,
        "phone": action.phone,
        "source_url": action.source_url,
        "verified_at": action.verified_at.isoformat() if action.verified_at else None,
    }

    effective_active = (
        body.is_active if body.is_active is not None else action.is_active
    )
    effective_phone = body.phone if body.phone is not None else action.phone
    effective_source = (
        body.source_url if body.source_url is not None else action.source_url
    )
    effective_verified = (
        body.verified_at if body.verified_at is not None else action.verified_at
    )

    has_phone = bool(effective_phone and effective_phone.strip())
    if effective_active and has_phone:
        if not effective_source or not effective_verified:
            raise AppError(
                "unverified_helpline",
                status=422,
                message_key="errors.unverified_helpline",
            )

    if body.label_en is not None:
        action.label_en = body.label_en
    if body.label_bn is not None:
        action.label_bn = body.label_bn
    if body.body_en is not None:
        action.body_en = body.body_en
    if body.body_bn is not None:
        action.body_bn = body.body_bn
    if body.context is not None:
        action.context = body.context
    if body.min_level is not None:
        action.min_level = body.min_level
    if body.provider is not None:
        action.provider = body.provider
    if body.phone is not None:
        action.phone = body.phone
    if body.source_url is not None:
        action.source_url = body.source_url
    if body.verified_at is not None:
        action.verified_at = body.verified_at
    if body.is_active is not None:
        action.is_active = body.is_active
    if body.sort_order is not None:
        action.sort_order = body.sort_order

    audit = AuditEvent(
        actor_id=admin.id,
        actor_role=admin.role,
        action="safe_action.update",
        entity_type="safe_action",
        entity_id=action.id,
        before=before,
        after={
            "is_active": action.is_active,
            "phone": action.phone,
            "source_url": action.source_url,
            "verified_at": action.verified_at.isoformat()
            if action.verified_at
            else None,
        },
    )
    session.add(audit)
    await session.flush()

    today = date.today()
    needs_reverification = bool(
        action.phone
        and (not action.verified_at or (today - action.verified_at).days > 90)
    )

    return SafeActionAdminOut(
        id=action.id,
        label_en=action.label_en,
        label_bn=action.label_bn,
        body_en=action.body_en,
        body_bn=action.body_bn,
        context=action.context,
        min_level=action.min_level,
        provider=action.provider,
        phone=action.phone,
        source_url=action.source_url,
        verified_at=action.verified_at,
        is_active=action.is_active,
        sort_order=action.sort_order,
        needs_reverification=needs_reverification,
        warning="Helpline not re-verified in 90 days" if needs_reverification else None,
    )


@router.delete("/safe-actions/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_safe_action_admin(
    id: str,
    admin: AdminUser,
    session: DbSession,
) -> Response:
    action = (
        await session.execute(select(SafeAction).where(SafeAction.id == id))
    ).scalar_one_or_none()
    if not action:
        raise AppError("not_found", status=404, message_key="errors.not_found")

    audit = AuditEvent(
        actor_id=admin.id,
        actor_role=admin.role,
        action="safe_action.delete",
        entity_type="safe_action",
        entity_id=action.id,
        before={"id": action.id, "label_en": action.label_en},
        after=None,
    )
    session.add(audit)
    await session.delete(action)
    await session.flush()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ===========================================================================
# 3. Quality Page
# ===========================================================================


@router.get("/quality", response_model=QualityMetricsResponse)
async def get_quality_metrics(session: DbSession) -> QualityMetricsResponse:
    # 1. Prompt versions
    prompts_stmt = select(PromptVersion).order_by(PromptVersion.created_at.desc())
    prompts = (await session.execute(prompts_stmt)).scalars().all()
    pv_out = [
        PromptVersionOut(
            id=p.id,
            name=p.name,
            version=p.version,
            body_sha256=p.body_sha256,
            is_active=p.is_active,
            created_at=p.created_at,
        )
        for p in prompts
    ]

    # 2. Eval runs
    evals_stmt = select(EvalRun).order_by(EvalRun.created_at.desc()).limit(20)
    evals = (await session.execute(evals_stmt)).scalars().all()
    eval_out = []
    latest_kpi_prec = None
    latest_kpi_rec = None
    latest_kpi_gen_high = None
    latest_kpi_unsafe = 0

    if evals:
        first = evals[0]
        latest_kpi_prec = float(first.high_precision) if first.high_precision else None
        latest_kpi_rec = float(first.high_recall) if first.high_recall else None
        latest_kpi_gen_high = (
            float(first.genuine_high_rate) if first.genuine_high_rate else None
        )
        latest_kpi_unsafe = first.unsafe_flags

    for er in evals:
        pv_name = er.prompt_version.name if er.prompt_version else None
        pv_ver = er.prompt_version.version if er.prompt_version else None
        eval_out.append(
            EvalRunOut(
                id=er.id,
                prompt_version_id=er.prompt_version_id,
                prompt_version_name=pv_name,
                prompt_version=pv_ver,
                dataset_version=er.dataset_version,
                item_count=er.item_count,
                high_precision=er.high_precision,
                high_recall=er.high_recall,
                genuine_high_rate=er.genuine_high_rate,
                unsafe_flags=er.unsafe_flags,
                report=er.report or {},
                created_at=er.created_at,
            )
        )

    # 3. Route, token, and cache metrics from checks
    checks_agg = (
        await session.execute(
            select(
                func.count(Check.id).label("total_checks"),
                func.coalesce(func.sum(Check.input_tokens), 0).label(
                    "total_input_tokens"
                ),
                func.coalesce(func.sum(Check.output_tokens), 0).label(
                    "total_output_tokens"
                ),
                func.coalesce(func.sum(Check.cache_read_tokens), 0).label(
                    "total_cache_read_tokens"
                ),
            )
        )
    ).one()

    total_checks = int(checks_agg.total_checks or 0)
    total_in = int(checks_agg.total_input_tokens or 0)
    total_out = int(checks_agg.total_output_tokens or 0)
    total_cache = int(checks_agg.total_cache_read_tokens or 0)
    cache_denom = total_in + total_cache
    cache_hit_rate = round(total_cache / cache_denom, 4) if cache_denom > 0 else 0.0

    # Route mix
    route_rows = (
        await session.execute(
            select(Check.route, func.count(Check.id))
            .group_by(Check.route)
            .order_by(desc(func.count(Check.id)))
        )
    ).all()

    route_mix = []
    for r_name, r_cnt in route_rows:
        pct = round(r_cnt / total_checks * 100, 1) if total_checks > 0 else 0.0
        route_mix.append(
            RouteMixItem(route=r_name or "unknown", count=r_cnt, percentage=pct)
        )

    return QualityMetricsResponse(
        kpi_precision=latest_kpi_prec,
        kpi_recall=latest_kpi_rec,
        kpi_genuine_high_rate=latest_kpi_gen_high,
        kpi_unsafe_flags=latest_kpi_unsafe,
        prompt_versions=pv_out,
        eval_runs=eval_out,
        route_mix=route_mix,
        total_checks=total_checks,
        total_input_tokens=total_in,
        total_output_tokens=total_out,
        total_cache_read_tokens=total_cache,
        cache_hit_rate=cache_hit_rate,
        notice="Measured on simulated data only (simulated-v1)",
    )


@router.post("/prompts/{id}/activate", response_model=PromptVersionOut)
async def activate_prompt_version(
    id: int,
    admin: AdminUser,
    session: DbSession,
) -> PromptVersionOut:
    target_pv = (
        await session.execute(select(PromptVersion).where(PromptVersion.id == id))
    ).scalar_one_or_none()
    if not target_pv:
        raise AppError("not_found", status=404, message_key="errors.not_found")

    # Latest eval run for this prompt version
    stmt = (
        select(EvalRun)
        .where(EvalRun.prompt_version_id == target_pv.id)
        .order_by(desc(EvalRun.created_at))
        .limit(1)
    )
    latest_run = (await session.execute(stmt)).scalar_one_or_none()

    # Targets in Section 10.7:
    # High-class precision: 0.90 or above
    # High-class recall: 0.85 or above
    # Genuine messages rated High: 3% or below (0.03)
    # Unsafe flags: 0, hard gate
    if not latest_run:
        raise AppError(
            "eval_gate_failed",
            status=409,
            message_key="errors.eval_gate_failed",
        )

    if latest_run.unsafe_flags > 0:
        raise AppError(
            "eval_gate_failed",
            status=409,
            message_key="errors.eval_gate_failed",
        )

    prec = float(latest_run.high_precision or 0)
    rec = float(latest_run.high_recall or 0)
    gen_high = float(latest_run.genuine_high_rate or 0)

    if prec < 0.90 or rec < 0.85 or gen_high > 0.03:
        raise AppError(
            "eval_gate_failed",
            status=409,
            message_key="errors.eval_gate_failed",
        )

    # Deactivate others of same name
    other_pvs = (
        (
            await session.execute(
                select(PromptVersion).where(
                    PromptVersion.name == target_pv.name,
                    PromptVersion.id != target_pv.id,
                )
            )
        )
        .scalars()
        .all()
    )
    for opv in other_pvs:
        opv.is_active = False

    target_pv.is_active = True

    audit = AuditEvent(
        actor_id=admin.id,
        actor_role=admin.role,
        action="prompt.activate",
        entity_type="prompt_version",
        entity_id=str(target_pv.id),
        before=None,
        after={"name": target_pv.name, "version": target_pv.version, "is_active": True},
    )
    session.add(audit)
    await session.flush()

    return PromptVersionOut(
        id=target_pv.id,
        name=target_pv.name,
        version=target_pv.version,
        body_sha256=target_pv.body_sha256,
        is_active=target_pv.is_active,
        created_at=target_pv.created_at,
    )


# ===========================================================================
# 4. Users
# ===========================================================================


@router.get("/users", response_model=list[AdminUserOut])
async def list_users_admin(session: DbSession) -> list[AdminUserOut]:
    stmt = select(User).order_by(User.created_at.desc())
    users = (await session.execute(stmt)).scalars().all()
    return [
        AdminUserOut(
            id=u.id,
            email=u.email,
            display_name=u.display_name,
            role=u.role,
            is_active=u.is_active,
            created_at=u.created_at,
        )
        for u in users
    ]


@router.post(
    "/users/invite", response_model=AdminInviteOut, status_code=status.HTTP_201_CREATED
)
async def invite_user_admin(
    body: AdminInviteIn,
    admin: AdminUser,
    session: DbSession,
) -> AdminInviteOut:
    clean_email = body.email.strip().lower()

    # Generate single-use 48-hour invite token
    raw_token = new_token()
    token_hash = hash_token(raw_token)
    expires_at = datetime.now(UTC) + timedelta(hours=48)

    auth_tok = AuthToken(
        email=clean_email,
        purpose=TokenPurpose.invite.value,
        role=body.role,
        token_hash=token_hash,
        expires_at=expires_at,
    )
    session.add(auth_tok)

    audit = AuditEvent(
        actor_id=admin.id,
        actor_role=admin.role,
        action="user.invite",
        entity_type="user",
        entity_id=clean_email,
        before=None,
        after={
            "email": clean_email,
            "role": body.role,
            "expires_at": expires_at.isoformat(),
        },
    )
    session.add(audit)
    await session.flush()

    # Dispatch invite email via EmailService
    email_service = EmailService(get_settings())
    invite_url = f"{get_settings().app_origin}/accept-invite?token={raw_token}"
    try:
        await email_service.send_invite(to=clean_email, link=invite_url, role=body.role)
    except Exception:
        pass

    return AdminInviteOut(
        email=clean_email,
        role=body.role,
        invite_url=invite_url,
        expires_at=expires_at,
    )


@router.patch("/users/{id}", response_model=AdminUserOut)
async def update_user_admin(
    id: UUID,
    body: AdminUserUpdateIn,
    admin: AdminUser,
    session: DbSession,
) -> AdminUserOut:
    target_user = (
        await session.execute(select(User).where(User.id == id))
    ).scalar_one_or_none()
    if not target_user:
        raise AppError("not_found", status=404, message_key="errors.not_found")

    before = {"role": target_user.role, "is_active": target_user.is_active}

    # Protect the last admin
    demoting_or_deactivating_admin = target_user.role == "admin" and (
        (body.role is not None and body.role != "admin") or (body.is_active is False)
    )

    if demoting_or_deactivating_admin:
        admin_count_stmt = select(func.count(User.id)).where(
            User.role == "admin",
            User.is_active.is_(True),
            User.id != target_user.id,
        )
        remaining_admins = (await session.execute(admin_count_stmt)).scalar_one() or 0
        if remaining_admins == 0:
            raise AppError(
                "last_admin",
                status=409,
                message_key="errors.last_admin",
            )

    role_changed = body.role is not None and body.role != target_user.role
    deactivated = body.is_active is False and target_user.is_active

    if body.role is not None:
        target_user.role = body.role
    if body.is_active is not None:
        target_user.is_active = body.is_active

    # "Role changes revoke that user's sessions." Also deactivation revokes sessions.
    if role_changed or deactivated:
        await session.execute(delete(Session).where(Session.user_id == target_user.id))

    audit = AuditEvent(
        actor_id=admin.id,
        actor_role=admin.role,
        action="user.update",
        entity_type="user",
        entity_id=str(target_user.id),
        before=before,
        after={"role": target_user.role, "is_active": target_user.is_active},
    )
    session.add(audit)
    await session.flush()

    return AdminUserOut(
        id=target_user.id,
        email=target_user.email,
        display_name=target_user.display_name,
        role=target_user.role,
        is_active=target_user.is_active,
        created_at=target_user.created_at,
    )


# ===========================================================================
# 5. API Keys
# ===========================================================================


@router.get("/api-keys", response_model=list[ApiKeyOut])
async def list_api_keys_admin(session: DbSession) -> list[ApiKeyOut]:
    stmt = select(ApiKey).order_by(ApiKey.created_at.desc())
    keys = (await session.execute(stmt)).scalars().all()
    return [
        ApiKeyOut(
            id=k.id,
            name=k.name,
            key_prefix=k.key_prefix,
            scopes=k.scopes or [],
            rate_limit_per_min=k.rate_limit_per_min,
            last_used_at=k.last_used_at,
            revoked_at=k.revoked_at,
            created_at=k.created_at,
            is_active=k.revoked_at is None,
        )
        for k in keys
    ]


@router.post(
    "/api-keys", response_model=ApiKeyCreateOut, status_code=status.HTTP_201_CREATED
)
async def create_api_key_admin(
    body: ApiKeyCreateIn,
    admin: AdminUser,
    session: DbSession,
) -> ApiKeyCreateOut:
    # Allowed scopes: checks:write, cases:read
    allowed_scopes = {"checks:write", "cases:read"}
    for sc in body.scopes:
        if sc not in allowed_scopes:
            raise AppError(
                "validation_failed",
                status=422,
                message_key="errors.invalid_scope",
            )

    prefix = f"prh_{body.key_type}_"
    raw_secret = secrets.token_hex(24)
    raw_key = f"{prefix}{raw_secret}"

    # Store SHA-256 hash ONLY
    key_hash = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()
    masked_prefix = f"{prefix}{raw_secret[:8]}..."

    api_key = ApiKey(
        name=body.name,
        key_prefix=masked_prefix,
        key_hash=key_hash,
        scopes=body.scopes,
        rate_limit_per_min=body.rate_limit_per_min,
        created_by=admin.id,
    )
    session.add(api_key)
    await session.flush()

    audit = AuditEvent(
        actor_id=admin.id,
        actor_role=admin.role,
        action="api_key.create",
        entity_type="api_key",
        entity_id=str(api_key.id),
        before=None,
        after={
            "name": api_key.name,
            "prefix": masked_prefix,
            "scopes": api_key.scopes,
            "rate_limit_per_min": api_key.rate_limit_per_min,
        },
    )
    session.add(audit)
    await session.flush()

    # The raw_key is shown ONLY ONCE here
    return ApiKeyCreateOut(
        id=api_key.id,
        name=api_key.name,
        key_prefix=masked_prefix,
        scopes=api_key.scopes,
        rate_limit_per_min=api_key.rate_limit_per_min,
        created_at=api_key.created_at,
        raw_key=raw_key,
        notice="Copy this key now. It will never be shown again.",
    )


@router.delete("/api-keys/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_api_key_admin(
    id: UUID,
    admin: AdminUser,
    session: DbSession,
) -> Response:
    api_key = (
        await session.execute(select(ApiKey).where(ApiKey.id == id))
    ).scalar_one_or_none()
    if not api_key:
        raise AppError("not_found", status=404, message_key="errors.not_found")

    if api_key.revoked_at is None:
        api_key.revoked_at = utcnow()
        audit = AuditEvent(
            actor_id=admin.id,
            actor_role=admin.role,
            action="api_key.revoke",
            entity_type="api_key",
            entity_id=str(api_key.id),
            before={"revoked_at": None},
            after={"revoked_at": api_key.revoked_at.isoformat()},
        )
        session.add(audit)
        await session.flush()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ===========================================================================
# 6. Audit Log (Read-Only)
# ===========================================================================


@router.get("/audit", response_model=AuditLogResponse)
async def list_audit_events_admin(
    session: DbSession,
    actor_id: UUID | None = Query(None),
    action: str | None = Query(None),
    entity_type: str | None = Query(None),
    from_date: str | None = Query(None, alias="from"),
    to_date: str | None = Query(None, alias="to"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
) -> AuditLogResponse:
    query = select(AuditEvent)

    if actor_id:
        query = query.where(AuditEvent.actor_id == actor_id)
    if action:
        query = query.where(AuditEvent.action == action)
    if entity_type:
        query = query.where(AuditEvent.entity_type == entity_type)
    if from_date:
        try:
            fd = date.fromisoformat(from_date)
            query = query.where(
                AuditEvent.created_at >= datetime.combine(fd, time.min, tzinfo=UTC)
            )
        except ValueError:
            pass
    if to_date:
        try:
            td = date.fromisoformat(to_date)
            query = query.where(
                AuditEvent.created_at <= datetime.combine(td, time.max, tzinfo=UTC)
            )
        except ValueError:
            pass

    count_q = select(func.count()).select_from(query.subquery())
    total = (await session.execute(count_q)).scalar_one() or 0

    paged = (
        query.order_by(desc(AuditEvent.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    events = (await session.execute(paged)).scalars().all()

    items = [
        AuditEventOut(
            id=e.id,
            actor_id=e.actor_id,
            actor_role=e.actor_role,
            action=e.action,
            entity_type=e.entity_type,
            entity_id=e.entity_id,
            before=e.before,
            after=e.after,
            request_id=e.request_id,
            created_at=e.created_at,
        )
        for e in events
    ]

    return AuditLogResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )
