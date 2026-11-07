# Prohori

Prohori is a Bangla-first, responsive web app that checks suspicious messages and
payment requests **before money is sent**, backed by a human-reviewed fraud
dashboard. A deterministic pipeline (normalisation, PII masking, rules, a payment
risk model, risk fusion) works with two Claude stages to return a clear risk
result and a safe next step. Reviewers triage reported cases and watch repeat
numbers and campaigns.

> **Prototype notice:** this prototype uses **simulated data only**. There are no
> real victims, phone numbers, or transactions, and no real money moves.

## Documentation

- `CLAUDE.md` — product summary, stack, folder pointers, and non-negotiable rules.
- `docs/PROHORI_DOC01.md` — product and design system.
- `docs/PROHORI_DOC02.md` — technical blueprint (architecture in Sections 6 and 7).
- `docs/PROGRESS.md` — phased build checklist (Phases 00–14).

## Stack

**Frontend:** React, Vite, TypeScript, Tailwind, Radix, TanStack Query, Recharts.
**Backend:** Python 3.12, FastAPI, SQLAlchemy 2 (async), Alembic, PostgreSQL 16
with pgvector, scikit-learn, Presidio, Pydantic.
**AI:** Claude Haiku 5.5 and Sonnet 5.5 via the official `anthropic` Python SDK.
