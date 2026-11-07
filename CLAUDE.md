# Prohori

## Product

Prohori is a Bangla-first, responsive web app that checks suspicious messages and
payment requests **before money is sent**, backed by a human-reviewed fraud
dashboard. The prototype uses **simulated data only** — no real victims, numbers
or transactions.

A user pastes a message or describes a payment request. A deterministic pipeline
(normalisation, PII masking, rules, a payment risk model, risk fusion) plus two
Claude stages produce a risk result with a clear next step. Reviewers triage
reported cases, decide enforcement, and watch repeat numbers and campaigns.

## Stack

**Frontend:** React, Vite, TypeScript, Tailwind, Radix, TanStack Query, Recharts.

**Backend:** Python 3.12, FastAPI, SQLAlchemy 2 (async), Alembic, PostgreSQL 16
with pgvector, scikit-learn, Presidio, Pydantic.

**AI/LLM:** Claude Haiku 5.5 (`claude-haiku-5-5`) and Claude Sonnet 5.5
(`claude-sonnet-5-5`), called through the official `anthropic` Python SDK.

## Folder layout

The repository follows the architecture in `docs/PROHORI_DOC02.md`:

- **Frontend layout** — `docs/PROHORI_DOC02.md` **Section 6** (Vite SPA, route
  groups `public/user/review/admin/system`, `components/`, `features/`, `lib/`,
  `i18n/`, `styles/`).
- **Backend layout** — `docs/PROHORI_DOC02.md` **Section 7** (layered FastAPI:
  `api/v1/`, `schemas/`, `models/`, `repositories/`, `services/`, `pipeline/`,
  `llm/`, `middleware/`, `alembic/`, `tests/`).

`docs/PROHORI_DOC01.md` holds the product and design system; `docs/PROHORI_DOC02.md`
holds the technical blueprint. `docs/PROGRESS.md` tracks the phased build.

## Non-negotiable rules

1. **Never store or log raw message text, full phone numbers, OTPs or PINs.**
2. **The model never sets the final risk level, writes a phone number, or says a
   payment is safe.** Fusion and the database own facts.
3. **Next steps come only from the `safe_actions` table.**
4. **Prohori never blocks a payment.** Every enforcement action needs a human
   reviewer.
5. **Low risk is never green and always carries a caution.**

## Working rules

- **Inspect before editing.** Read existing files and follow the folder structure
  in Doc 02 Sections 6 and 7 before changing anything.
- **No placeholders.** Implement real logic — real backend logic, real queries,
  real pipeline stages. No stubbed returns or fake data paths.
- **Connect frontend to backend.** Features work end to end, not in isolation.
- **Run tests.** Run the tests and lint you can, and show the output.
- **Report errors honestly.** If something fails or is unverified, say so plainly
  with the real output. Never claim success you did not confirm.
- **Explain environment variables without printing secrets.**
- **Update `docs/PROGRESS.md` at the end of each phase.**
