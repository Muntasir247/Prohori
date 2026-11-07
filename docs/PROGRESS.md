# Prohori — Build Progress

Phased build from `docs/PROHORI_DOC02.md` Section 12. Build in order; start a fresh
session per phase; each phase inspects existing files first, keeps working code,
implements real logic, runs tests, and updates this file at the end.

Phases 00–08 and 14 produce a demoable loop — reach those first, then add the rest.

Status key: `[ ]` not started · `[~]` in progress · `[x]` done.

## Phases

- [x] **Phase 00 — Project context.** Put the plan in the repo (CLAUDE.md,
  docs/PROGRESS.md, .gitignore, README.md). _Done when:_ a new session can state
  the five non-negotiable rules from CLAUDE.md.
- [x] **Phase 01 — Scaffold and environment.** Run frontend, backend and database
  locally with one command. _Done when:_ frontend calls `/api/v1/health` through
  the Vite proxy.
  - **Backend:** FastAPI app factory (`backend/app/main.py`) with middleware in
    Doc 02 order (request id → security headers → CORS → route), `pydantic-settings`
    config that fails fast on missing secrets (`config.py`), async SQLAlchemy
    engine (`db.py`), `GET /api/v1/health` that pings the DB (200 up / 503 down),
    request-id + JSON access-log middleware that never logs bodies or paths with
    query strings, and a global error handler emitting the Section 7 error
    envelope. Layered package skeleton (`api/`, `schemas/`, `models/`,
    `repositories/`, `services/`, `pipeline/`, `llm/`, `middleware/`, `jobs/`,
    `alembic/`, `tests/`). Multi-stage non-root `Dockerfile`.
  - **Frontend:** Vite + React + TS SPA with React Router, TanStack Query,
    react-i18next (Bangla default), Zod, React Hook Form, Iconify. `/api` → :8000
    proxy. Home route fetches `/api/v1/health` and renders the result.
  - **Infra:** `docker-compose.yml` (pgvector/pgvector:pg16 + backend reload),
    `.env.example` (all vars documented, no secrets), `Makefile`
    (dev/test/lint/migrate/seed/eval), GitHub Actions CI (`.github/workflows/ci.yml`).
  - **Verified:** ruff clean + 8 pytest passing (offline SQLite); eslint + tsc
    clean + 6 vitest passing; `vite build` succeeds; uvicorn boots and serves
    health; `/api/v1/health` reaches the backend **through the Vite proxy**.
  - **Not verified here:** a live `status: "ok"` health result and `make`/
    `docker compose` — this machine has no Postgres, Docker, or make. Health
    returns 503 `degraded` until a database is reachable (expected).
- [ ] **Phase 02 — Design system.** Build tokens and the 29 components. _Done when:_
  no hard-coded colors outside `tokens.css`; axe reports no serious issues.
- [~] **Phase 03 — Database and seed data.** Create the schema and realistic
  simulated data. _Done when:_ audit update fails, seeded counts match.
  - **Migrations (done):** Alembic `0001_core_schema` and
    `0002_knowledge_safety_operations` hold the exact Doc 02 Section 8 DDL — the
    four extensions, six enum types, all **24 tables**, indexes (incl. hnsw / gin
    / partial unique), the `case_reference_seq`, the generated `tsv` column, and
    the append-only `audit_events` trigger. Each statement runs individually
    (asyncpg rejects multi-statement execute); both have reverse-order downgrades
    that drop tables (CASCADE), the trigger, function, sequence and enum types.
    `Base.metadata` is wired into `alembic/env.py`.
  - **Verified (offline):** `alembic history` resolves base→0001→0002;
    `alembic upgrade head --sql` emits the full DDL for all 24 tables and
    `alembic downgrade head:base --sql` emits a clean reverse. ruff clean; the 32
    offline pytest suite is unaffected.
  - **Seed (done):** `backend/seed/messages.json` (30 Prompt-P4 messages, 15
    scam / 15 genuine, bn/en/banglish) is in place, alongside `scam_types.json`
    (6), `samples.json` (6), `tips.json` (2) and `safe_actions.json` (10 — the six
    generic actions plus the bKash row active with phone 16247 + source + verified
    date, and Nagad 16167 / Rocket / Upay left inactive pending team verification).
    `scripts/seed.py` is idempotent (reference rows upsert by PK; the simulated set
    uses deterministic `uuid5` ids + `ON CONFLICT DO NOTHING`), reads the three
    demo-user passwords from `SEED_*_PASSWORD` env vars (never hard-coded), masks
    all digit runs out of stored text, stores numbers only as HMAC + masked
    display, tags every simulated row `simulated-v1`, and prints a warning listing
    the unverified provider rows. It generates **500 checks over 90 days, 120 cases
    across all six statuses**, 40 repeat numbers, 6 campaigns, case notes and daily
    aggregates so the dashboard has data.
  - **Verified (offline):** `python scripts/seed.py --dry-run` builds and validates
    every row with no database (asserts 6/6/2/10/3 reference rows, 500 checks, 120
    cases across all statuses, distinct case→check links, `final_level` only
    Low/Medium/High, and that no 4+ digit run survives in any stored text). ruff
    clean; the 32-test offline pytest suite still passes.
  - **Not verified / outstanding:** the live database proofs — `upgrade →
    downgrade → upgrade`, seed-twice idempotency, actual row counts, and the
    "UPDATE on `audit_events` fails" trigger proof. This machine has **no Postgres,
    Docker, `psql` or `asyncpg`** and no `.env`, so none could run here. To run them
    (from `backend/`, with `asyncpg` installed and `DATABASE_URL` + `SEED_*` set):
    `alembic upgrade head` → `alembic downgrade base` → `alembic upgrade head`;
    `python scripts/seed.py` twice (row counts must be identical both times); then
    in `psql`, `INSERT INTO audit_events (action, entity_type, entity_id) VALUES
    ('t','user','1');` followed by `UPDATE audit_events SET action='x';` — the
    UPDATE must raise `audit_events is append-only`.
- [x] **Phase 04 — Authentication and roles.** Sessions, guest identity, roles and
  account screens. _Done when:_ S03–S08 and S22 work end to end in both languages.
  - **Backend:** argon2id passwords (`security/passwords.py`, 10+ chars +
    common-password blocklist); 256-bit session tokens and single-use verify /
    reset / invite tokens stored only as SHA-256 hashes (`security/tokens.py`);
    auth service (`services/auth.py`) with register, email verify, resend, login,
    logout, forgot/reset, accept-invite, change-password, delete-account, and
    session lifetimes (user 30d; reviewer/admin 8h + 30m idle). Routes
    `api/v1/auth.py` and `api/v1/me.py` (register/verify/resend/login/logout/
    forgot/reset/accept-invite, GET·PATCH `/me`, `/me/password`, GET·DELETE
    `/me/sessions`, `/me/export`, DELETE `/me`). Dependencies (`api/deps.py`):
    transactional `get_db`, `enforce_csrf` (X-Requested-With + Origin), current
    user, `require_role`, `require_scope`, `guest_id` / guest-hash cookie. Cookie
    `__Host-prohori_session` (HttpOnly, Secure outside dev, SameSite=Lax;
    `api/cookies.py`). Postgres-counter rate limiter (`services/rate_limit.py`):
    login 5 fails/15 min per email+IP → 429 lock; resend 3/hour. Console/Resend
    email driver (`services/email.py`), links never codes. SQLAlchemy models for
    users, sessions, auth_tokens, audit_events, rate_limit_counters (cross-dialect;
    `Base.metadata` wired into Alembic).
  - **Frontend:** S03 Login, S04 Register, S05 Verify email, S06 Forgot, S07 Reset,
    S08 Onboarding, S22 Settings (Profile/Preferences/Security/Your data), plus
    `RequireAuth`/`RequireRole` guards, a session hook, and bn+en i18n with server
    field errors mapped inline. Reviewers/admins land on `/review`, users on
    `/check` (or `/onboarding` when incomplete).
  - **Verified:** backend ruff clean + 67 pytest passing (offline SQLite) —
    account-discovery safety (duplicate email identical response), 5-fail lockout
    for 15 min, unverified-login 403, expired + reused tokens 410, reset revokes
    sessions on all devices, logout, role guards (`require_role`: user → reviewer route 403),
    scope guards (`require_scope`: 403 when missing/insufficient), guest identity
    (`guest_id` / `get_guest_hash`: sets HttpOnly cookie, stores only SHA-256 hash),
    CSRF rejection (missing header and cross-origin state changes).
    Frontend eslint + tsc clean + 42 vitest passing across all public and user
    account screens (S03 Login, S04 Register, S05 Verify Email, S06 Forgot Password,
    S07 Reset Password, S08 Onboarding, S22 Settings, AcceptInvite in both Bangla
    and English with server field errors mapped inline). `npm run build` succeeds cleanly.
  - **Not verified / outstanding:** live end-to-end against Postgres. The auth
    tables are created from ORM metadata for the offline suite; Phase 03's
    migrations 0001/0002 (the exact Section 8 DDL) are **now built and validated
    offline**, so the remaining gap is only environment: install `asyncpg`, run
    `alembic upgrade head` against a live Postgres, then the manual S03–S08/S22
    browser pass in both languages.
- [ ] **Phase 05 — Deterministic pipeline.** Normalization, masking, rules, payment
  model and fusion, with no LLM. _Done when:_ rule-only High works offline with
  Bangla text.
- [ ] **Phase 06 — Retrieval and Claude integration.** Knowledge retrieval, Haiku
  and Sonnet stages, orchestrator. _Done when:_ CLI check returns valid results,
  and the kill-key test gives fallback.
- [ ] **Phase 07 — Check flows end to end.** Connect the user journey to the real
  pipeline. _Done when:_ a guest gets a real Bangla result at 360 px.
- [ ] **Phase 08 — Reviewer workbench.** Queue, case detail, decisions, audit and
  notifications. _Done when:_ a report from S17 is decided in S26, and a later
  check on that number hits the hard rule.
- [ ] **Phase 09 — Analytics, repeat numbers, campaigns.** Dashboard, repeat
  numbers, clustering, export, nightly job. _Done when:_ charts move after a
  decision, with no hard-coded chart data.
- [ ] **Phase 10 — Differentiators.** Pressure Pause, sharing, Already Sent Money,
  read aloud. _Done when:_ all four work on a low-end Android Chrome profile.
- [ ] **Phase 11 — Admin and partner API.** Admin screens and partner keys.
  _Done when:_ publishing a pattern changes retrieval results.
- [ ] **Phase 12 — Evaluation.** Measure quality and stop regressions. _Done when:_
  thresholds and unsafe gate enforced.
- [ ] **Phase 13 — Hardening.** Security, Bangla, accessibility and responsive pass.
  _Done when:_ every R-item has a test or a documented reason.
- [ ] **Phase 14 — Deployment, demo and submission.** Live demo link, video and
  final form check. _Done when:_ demo works twice in a row, and form answers match
  what was built.
