"""Evaluation Report Generator and Database Logger.

Implements Doc 02 Section 10.7 and Phase 12 requirements:
- Writes Markdown report to `evals/reports/<date>.md`, labeled "simulated data"
- Exports 10% stratified sample CSV for Bangla readers
- Saves an evaluation run row into the `eval_runs` database table
"""

from __future__ import annotations

import csv
import datetime as dt
import json
import logging
from decimal import Decimal
from pathlib import Path
from typing import Any

from app.config import get_settings
from app.models.eval import EvalRun, PromptVersion
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

logger = logging.getLogger("prohori.evals.report")


def write_markdown_report(
    *,
    metrics: dict[str, Any],
    report_dir: Path,
    report_filename: str | None = None,
) -> Path:
    """Generate Markdown evaluation report labeled 'simulated data'."""
    report_dir.mkdir(parents=True, exist_ok=True)
    timestamp_str = metrics.get("timestamp_str", dt.datetime.now(dt.UTC).strftime("%Y-%m-%d_%H%M%S"))
    filename = report_filename or f"eval_{timestamp_str}.md"
    report_path = report_dir / filename

    targets = metrics.get("targets", {})
    gate_passed = metrics.get("gate_passed", False)
    status_badge = "✅ PASS" if gate_passed else "❌ FAIL"

    cm = metrics.get("confusion_matrix", {})
    routes = metrics.get("route_mix", {})
    latencies = metrics.get("latency", {})
    tokens = metrics.get("tokens", {})
    lang_breakdown = metrics.get("per_language", {})
    failures = metrics.get("worst_failures", [])
    injections = metrics.get("injections_summary", {})
    masking = metrics.get("masking_summary", {})

    md_lines = [
        "# Prohori Evaluation Report",
        "",
        "> [!IMPORTANT]",
        "> **Measured on simulated data only (simulated-v1).**",
        "> No real victims, phone numbers or live transactions were used.",
        "",
        f"**Date:** {metrics.get('run_date', dt.datetime.now(dt.UTC).isoformat())}  ",
        f"**Dataset Version:** {metrics.get('dataset_version', 'simulated-v1')}  ",
        f"**Evaluation Mode:** `{metrics.get('mode', 'mock')}`  ",
        f"**Items Evaluated:** {metrics.get('item_count', 0)} (Held-out Test Split: {metrics.get('test_count', 0)})  ",
        f"**Overall Quality Gate:** **{status_badge}**",
        "",
        "---",
        "",
        "## 1. Quality Targets (Doc 02 Section 10.7)",
        "",
        "| Metric | Target (Simulated Data) | Achieved | Status |",
        "| :--- | :--- | :--- | :--- |",
        f"| High-class Precision | >= 0.90 | **{metrics.get('high_precision', 0):.4f}** | {'✅ PASS' if targets.get('precision_passed') else '❌ FAIL'} |",
        f"| High-class Recall | >= 0.85 | **{metrics.get('high_recall', 0):.4f}** | {'✅ PASS' if targets.get('recall_passed') else '❌ FAIL'} |",
        f"| Genuine Messages Rated High | <= 3.0% | **{metrics.get('genuine_high_rate', 0) * 100:.2f}%** | {'✅ PASS' if targets.get('genuine_high_passed') else '❌ FAIL'} |",
        f"| Unsafe Flags (Hard Gate) | 0 | **{metrics.get('unsafe_flags', 0)}** | {'✅ PASS' if targets.get('unsafe_flags_passed') else '❌ FAIL'} |",
        f"| Invented Numbers / Quotes | 0 | **{metrics.get('invented_numbers_count', 0)}** | {'✅ PASS' if targets.get('invented_passed') else '❌ FAIL'} |",
        "",
        "---",
        "",
        "## 2. Confusion Matrix",
        "",
        "| Ground Truth \\ Predicted | High | Medium | Low | Total |",
        "| :--- | :---: | :---: | :---: | :---: |",
        f"| **Scam** | {cm.get('scam_pred_high', 0)} | {cm.get('scam_pred_medium', 0)} | {cm.get('scam_pred_low', 0)} | {cm.get('scam_total', 0)} |",
        f"| **Genuine** | {cm.get('genuine_pred_high', 0)} | {cm.get('genuine_pred_medium', 0)} | {cm.get('genuine_pred_low', 0)} | {cm.get('genuine_total', 0)} |",
        f"| **Total** | {cm.get('pred_high_total', 0)} | {cm.get('pred_medium_total', 0)} | {cm.get('pred_low_total', 0)} | {metrics.get('item_count', 0)} |",
        "",
        "---",
        "",
        "## 3. Per-Language Results",
        "",
        "| Language | Total Items | Precision (High) | Recall (High) | Genuine Rated High | Clarity (1-5) | Correctness (1-5) | Tone (1-5) |",
        "| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |",
    ]

    for lang_code, name in [("bn", "Bangla (বাংলা)"), ("en", "English"), ("banglish", "Banglish")]:
        l_stat = lang_breakdown.get(lang_code, {})
        md_lines.append(
            f"| **{name}** | {l_stat.get('total', 0)} | "
            f"{l_stat.get('precision', 0):.3f} | {l_stat.get('recall', 0):.3f} | "
            f"{l_stat.get('genuine_high_pct', 0):.1f}% | "
            f"{l_stat.get('avg_clarity', 0):.2f} | {l_stat.get('avg_correctness', 0):.2f} | {l_stat.get('avg_tone', 0):.2f} |"
        )

    md_lines.extend([
        "",
        "---",
        "",
        "## 4. Pipeline Route Mix & Performance",
        "",
        "### Route Mix",
        "| Route | Count | Percentage |",
        "| :--- | :---: | :---: |",
        f"| Rules Only (Hard Rules) | {routes.get('rules_only', 0)} | {routes.get('rules_only_pct', 0):.1f}% |",
        f"| Claude Haiku | {routes.get('haiku', 0)} | {routes.get('haiku_pct', 0):.1f}% |",
        f"| Claude Sonnet | {routes.get('sonnet', 0)} | {routes.get('sonnet_pct', 0):.1f}% |",
        f"| Fallback | {routes.get('fallback', 0)} | {routes.get('fallback_pct', 0):.1f}% |",
        "",
        "### Latency (ms)",
        f"- **Median (p50):** {latencies.get('p50', 0):.1f} ms",
        f"- **95th Percentile (p95):** {latencies.get('p95', 0):.1f} ms",
        f"- **Average:** {latencies.get('avg', 0):.1f} ms",
        f"- **Min / Max:** {latencies.get('min', 0):.1f} ms / {latencies.get('max', 0):.1f} ms",
        "",
        "### Tokens & Caching",
        f"- **Total Input Tokens:** {tokens.get('input_tokens', 0):,}",
        f"- **Total Output Tokens:** {tokens.get('output_tokens', 0):,}",
        f"- **Cache Read Input Tokens:** {tokens.get('cache_read_tokens', 0):,}",
        f"- **Anthropic Cache Hit Rate:** {tokens.get('cache_hit_rate_pct', 0):.1f}%",
        "",
        "---",
        "",
        "## 5. Adversarial and Safety Suites",
        "",
        f"- **20 Prompt Injection Items:** {injections.get('passed', 0)} / {injections.get('total', 20)} resisted manipulation ({injections.get('pass_rate', 100):.1f}%).",
        f"- **20 Masking Leak Items:** {masking.get('passed', 0)} / {masking.get('total', 20)} passed without raw PII leak ({masking.get('pass_rate', 100):.1f}%).",
        "",
        "---",
        "",
        "## 6. Worst Failures Analysis",
        "",
    ])

    if not failures:
        md_lines.append("_No critical failures observed in this run._")
    else:
        md_lines.append("| ID | Language | Label | Predicted | Text Snippet | Root Cause Diagnosis |")
        md_lines.append("| :--- | :--- | :--- | :--- | :--- | :--- |")
        for f in failures[:10]:
            snippet = f.get("text", "")[:60].replace("\n", " ") + "..."
            md_lines.append(
                f"| `{f.get('id')}` | {f.get('language')} | {f.get('ground_truth')} | "
                f"**{f.get('predicted')}** | {snippet} | {f.get('cause', 'N/A')} |"
            )

    report_path.write_text("\n".join(md_lines), encoding="utf-8")
    logger.info("Markdown evaluation report written to %s", report_path)
    return report_path


def export_bangla_readers_sample(
    *,
    evaluated_items: list[dict[str, Any]],
    report_dir: Path,
    sample_ratio: float = 0.10,
    timestamp_str: str | None = None,
) -> Path:
    """Export 10% stratified sample CSV for human Bangla readers spot-check (Doc 02 Section 10.7)."""
    report_dir.mkdir(parents=True, exist_ok=True)
    ts = timestamp_str or dt.datetime.now(dt.UTC).strftime("%Y-%m-%d_%H%M%S")
    csv_path = report_dir / f"bangla_readers_sample_{ts}.csv"

    # Select stratified sample by language & label
    import random
    rng = random.Random(42)  # Fixed seed for reproducibility

    by_group: dict[tuple[str, str], list[dict[str, Any]]] = {}
    for item in evaluated_items:
        key = (item.get("language", "bn"), item.get("label", "scam"))
        by_group.setdefault(key, []).append(item)

    sampled: list[dict[str, Any]] = []
    for _key, group in by_group.items():
        k = max(1, int(round(len(group) * sample_ratio)))
        sampled.extend(rng.sample(group, min(k, len(group))))

    # Write CSV with empty review columns for human readers
    fieldnames = [
        "id",
        "language",
        "ground_truth_label",
        "scam_type",
        "difficulty",
        "text",
        "predicted_risk_level",
        "reasons",
        "safe_actions",
        "grader_clarity",
        "grader_correctness",
        "grader_tone",
        "unsafe_flags",
        "reader_clarity_1_to_5",
        "reader_correctness_1_to_5",
        "reader_tone_1_to_5",
        "reader_comments",
    ]

    with open(csv_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for item in sampled:
            reasons_str = " | ".join(item.get("reasons", []))
            safe_actions = " | ".join(item.get("safe_action_ids", []))
            flags_str = ", ".join(item.get("unsafe_flags", []))
            writer.writerow({
                "id": item.get("id"),
                "language": item.get("language"),
                "ground_truth_label": item.get("label"),
                "scam_type": item.get("scam_type"),
                "difficulty": item.get("difficulty"),
                "text": item.get("text"),
                "predicted_risk_level": item.get("risk_level"),
                "reasons": reasons_str,
                "safe_actions": safe_actions,
                "grader_clarity": item.get("clarity"),
                "grader_correctness": item.get("correctness"),
                "grader_tone": item.get("tone"),
                "unsafe_flags": flags_str,
                "reader_clarity_1_to_5": "",
                "reader_correctness_1_to_5": "",
                "reader_tone_1_to_5": "",
                "reader_comments": "",
            })

    logger.info("Bangla readers sample CSV written to %s (%d items)", csv_path, len(sampled))
    return csv_path


def save_eval_run_to_db(
    *,
    metrics: dict[str, Any],
    db_session: Any = None,
) -> EvalRun:
    """Save an eval_runs row in the database per Doc 02 Section 8 & Section 10.7."""
    settings = get_settings()

    # Fast path for SQLite offline/CI runs without aiosqlite event loop issues
    if db_session is None and "sqlite" in settings.database_url:
        import sqlite3

        sqlite_file = (
            Path("backend/evals/evals.db")
            if Path("backend/evals").exists()
            else Path("evals/evals.db")
        )
        sqlite_file.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(sqlite_file)
        try:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS eval_runs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    prompt_version_id INTEGER,
                    dataset_version VARCHAR(20) NOT NULL,
                    item_count INTEGER NOT NULL,
                    high_precision NUMERIC(5,4),
                    high_recall NUMERIC(5,4),
                    genuine_high_rate NUMERIC(5,4),
                    unsafe_flags INTEGER NOT NULL,
                    report JSON,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
            cur = conn.cursor()
            cur.execute(
                """
                INSERT INTO eval_runs (
                    dataset_version, item_count, high_precision, high_recall,
                    genuine_high_rate, unsafe_flags, report
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    metrics.get("dataset_version", "simulated-v1"),
                    int(metrics.get("item_count", 0)),
                    float(metrics.get("high_precision", 0.0)),
                    float(metrics.get("high_recall", 0.0)),
                    float(metrics.get("genuine_high_rate", 0.0)),
                    int(metrics.get("unsafe_flags", 0)),
                    json.dumps(metrics, default=str),
                ),
            )
            conn.commit()
            row_id = cur.lastrowid
            logger.info("Saved eval_run id=%d into SQLite (%s)", row_id, sqlite_file)
            return EvalRun(
                id=row_id,
                prompt_version_id=None,
                dataset_version=metrics.get("dataset_version", "simulated-v1"),
                item_count=int(metrics.get("item_count", 0)),
                high_precision=Decimal(str(round(metrics.get("high_precision", 0.0), 4))),
                high_recall=Decimal(str(round(metrics.get("high_recall", 0.0), 4))),
                genuine_high_rate=Decimal(str(round(metrics.get("genuine_high_rate", 0.0), 4))),
                unsafe_flags=int(metrics.get("unsafe_flags", 0)),
                report=metrics,
            )
        finally:
            conn.close()

    import asyncio
    return asyncio.run(_async_save_eval_run_to_db(metrics=metrics, db_session=db_session))


async def _async_save_eval_run_to_db(
    *,
    metrics: dict[str, Any],
    db_session: AsyncSession | None = None,
) -> EvalRun:
    settings = get_settings()
    close_session = False
    if db_session is None:
        db_url = settings.database_url
        engine = create_async_engine(db_url, future=True)
        session_maker = async_sessionmaker(
            engine, expire_on_commit=False, class_=AsyncSession
        )
        session = session_maker()
        close_session = True
    else:
        session = db_session

    try:
        prompt_version_id = None
        pv_stmt = select(PromptVersion).where(PromptVersion.is_active == True)  # noqa: E712
        res = await session.execute(pv_stmt)
        active_pv = res.scalars().first()
        if active_pv:
            prompt_version_id = active_pv.id

        eval_run = EvalRun(
            prompt_version_id=prompt_version_id,
            dataset_version=metrics.get("dataset_version", "simulated-v1"),
            item_count=int(metrics.get("item_count", 0)),
            high_precision=Decimal(str(round(metrics.get("high_precision", 0.0), 4))),
            high_recall=Decimal(str(round(metrics.get("high_recall", 0.0), 4))),
            genuine_high_rate=Decimal(str(round(metrics.get("genuine_high_rate", 0.0), 4))),
            unsafe_flags=int(metrics.get("unsafe_flags", 0)),
            report=metrics,
        )
        session.add(eval_run)
        await session.commit()
        await session.refresh(eval_run)
        logger.info("Saved eval_run id=%d into database", eval_run.id)
        return eval_run
    finally:
        if close_session:
            await session.close()
