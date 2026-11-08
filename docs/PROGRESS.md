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
- [x] **Phase 05 — Deterministic pipeline.** Normalization, masking, rules, payment
  model and fusion, with no LLM. _Done when:_ rule-only High works offline with
  Bangla text.
  - **Normalization (`pipeline/normalize.py`):** Unicode NFC normalization; Bangla
    digits (`০-৯`) to ASCII (`0-9`) translation; amounts parsed strictly into Decimal BDT
    without float rounding (R05) handling taka, Tk, BDT, ৳, and lakh/lac/crore/thousand
    forms; phone numbers canonicalized to E.164 (`+8801XXXXXXXXX`) via phonenumbers;
    Unicode-script language detection (`bn`, `en`, `mixed`).
  - **PII Masking (`pipeline/masking.py`):** Presidio Analyzer configured with custom
    Bangladesh recognizers (`BDPhoneRecognizer` for both digit sets, `BDNIDRecognizer`
    for 10/13/17-digit NIDs, `BDAccountRecognizer` for 8-16 digit bank/wallet accounts,
    `EmailRecognizer`, `URLQueryRecognizer` for links, and `BanglaNameRecognizer` for
    honorific and label context). Completely removes OTP/PIN/CVV codes near keywords in
    Bangla, English, and Banglish (keeping only the boolean fact of detection). Replaces
    entities with stable indexed placeholders (`[PHONE_1]`, `[ACCOUNT_1]`, `[NID_1]`,
    `[EMAIL_1]`, `[LINK_1]`, `[NAME_1]`). Phone numbers stored only as HMAC-SHA256 hashes
    using `NUMBER_HMAC_KEY` (never plain SHA) with safe display format `+880 17** ***678`.
    Filters out English NER false positives on Bengali script and honestly reports
    unlabeled Bangla name misses per Risk R07.
  - **Rule Engine (`pipeline/rules/`):** Declarative `rules.yaml` and deterministic
    `RuleEngine`. Hard rules: credential requests (`HARD_OTP_PIN_PASSWORD`), confirmed
    fraudulent numbers (`HARD_CONFIRMED_RISKY_NUMBER`). Soft rules: urgency (`SOFT_URGENCY`),
    impersonation (`SOFT_IMPERSONATION`), suspicious link/domain (`SOFT_LINK_MISMATCH`),
    unusual amount/advance fee (`SOFT_UNUSUAL_AMOUNT`), prize/lottery/cashback
    (`SOFT_PRIZE_WORDING`), wrong-number refund story (`SOFT_REFUND_STORY`).
  - **Payment Model (`training/train_payment_model.py` & `pipeline/riskmodel.py`):**
    Generates 6,000 synthetic records and trains a scikit-learn `LogisticRegression`
    pipeline with `ColumnTransformer` (OneHotEncoder on amount band, recipient status,
    channel; StandardScaler on urgency, hour). Evaluated on 20% holdout (94.5% accuracy,
    0.9908 ROC-AUC), saving versioned `payment_risk_model.joblib` artifact explicitly
    labeled `simulated: True`. Predictor returns probability, candidate level (under 0.40
    Low, 0.40–0.74 Medium, 0.75+ High), and top contributing factors explained in both
    Bangla and English from model coefficients.
  - **Risk Fusion (`pipeline/fusion.py`):** Implements Doc 02 Section 10.3 table exactly
    as a pure function: Hard rule -> Floor High; 2+ Soft rules -> Floor Medium;
    Draft level = max(floor, llm, payment); False-positive Cap: when message has no rule
    hits and LLM says Low, High from score alone becomes Medium; LLM can never lower a
    floor; Model down with no rule hit returns null final_level (S16).
  - **Templates (`pipeline/templates.py`):** Pre-authored fixed Bangla and English
    explanations, cautions, and safe action IDs for rule-only flows, bypassing LLMs
    entirely when hard rules trigger.
  - **Verified (offline):** 53 new pytest unit, property, and integration tests passing:
    - 0 leaks on 45 fixture strings in `tests/fixtures/pii_fixtures.json` (no phone numbers,
      OTPs, PINs, CVVs, emails, NIDs, or URL query parameters survive in masked text).
    - Transparent R07 audit report printed during test run documenting unlabeled
      Bangla name limitations without an external Bangla NER model.
    - Hypothesis property tests (`tests/test_fusion_properties.py`) mathematically
      proving: (1) LLM can never lower a floor; (2) null LLM level with no rule hit
      returns null; (3) false-positive cap holds; (4) 2+ soft rules enforce Medium floor.
    - Integration test (`tests/test_rule_only_offline.py`) proving "Rule-only High works
      offline with Bangla text", delivering level High, fixed Bangla explanation, and
      safe action IDs without calling any LLM.
    - All Phase 05 files pass Ruff check and formatting with 0 errors.
- [x] **Phase 06 — Retrieval and Claude integration.** Knowledge retrieval, Haiku
  and Sonnet stages, orchestrator. _Done when:_ CLI check returns valid results,
  and the kill-key test gives fallback.
  - **Claude Client (`llm/client.py`):** Uses official `anthropic` Python SDK (`anthropic==2.6.0`).
    Models `claude-haiku-5-5` and `claude-sonnet-5-5` loaded from config. Structured outputs
    powered by `client.messages.parse(output_format=Schema)`. Omits sampling parameters
    (temperature, top_p, top_k, budget_tokens) per Doc 02 Section 10.2. Applies `output_config={"effort": "low"}`
    for Haiku routes and `{"effort": "medium"}` for Sonnet. Server-side fallback on Sonnet
    implemented via `extra_headers={"anthropic-beta": "server-side-fallback-2026-07-01,prompt-caching-2024-07-31"}`
    and `extra_body={"fallbacks": [{"model": haiku, "output_config": {"effort": "low"}}]}`.
    Timeouts enforced: Haiku 4s, Sonnet 8s, `max_retries=1`. Inspects `stop_reason` for `refusal`
    and `max_tokens`. Logs `usage.cache_read_input_tokens` and enforces `DAILY_LLM_SPEND_CAP_USD`.
  - **Versioned Prompts (`llm/prompts/`):** P1 (`p1_triage_v1.py`), P2 (`p2_analysis_v1.py`),
    P3 (`p3_payment_v1.py`), and P6 (`p6_hyde_v1.py`) stored verbatim from Doc 02 Section 10.5.
    Stable system prompt and few-shot examples (Examples 1, 2, 3) placed first with `cache_control`
    `{"type": "ephemeral"}` applied.
  - **Structured Schemas (`llm/schemas.py`):** Pydantic schemas for `TriageResult`, `AnalysisResult`,
    `PaymentExplanationResult`, and `RedFlagItem`.
  - **Knowledge Base Seed & Embedding (`seed/knowledge/` & `scripts/embed_kb.py`):**
    Created seed documents for 6 scam types (`PAT-001` to `PAT-006`). Chunks documents at 200–400
    tokens with ~40 tokens overlap. Embeds with Voyage AI (`voyage-4`, 1024 dims). Skips unchanged
    chunks via SHA-256 hash matching. Halts with error if `backend/seed/knowledge/` is empty.
    Dual persistence in Postgres `kb_chunks` and serialized `kb_chunks.joblib` for offline/fallback use.
  - **Hybrid Retrieval (`pipeline/retrieval.py`):** Trigram similarity (character 3-grams) + keyword
    term matching + 1024-dim cosine vector similarity merged using Reciprocal Rank Fusion ($k=60$, top 4).
    Weak top vector similarity (< 0.65) triggers Haiku HyDE (Prompt P6) once. Falls back to keyword-only
    if embeddings or Voyage API fail.
  - **Triage (`pipeline/triage.py`):** Haiku triage (Prompt P1) extracting language, claimed sender,
    amounts, urgency phrases, normalized query, and clarity. Merges with deterministic regex fields
    where regex wins on numbers, amounts, and links per Section 10.6.1. On timeout or error, falls
    back to regex fields and sets clarity="ambiguous" to route to Sonnet.
  - **Analysis & Output Validation (`pipeline/analysis.py`):** Haiku route for `clear_genuine` with 0
    soft rules; Sonnet route for `clear_scam` or `ambiguous`. Validates `risk_level` enum, filters
    `next_step_ids` against `<allowed_actions>`, drops hallucinated `pattern_codes`, and verifies
    quotes in `red_flags` character-for-character against `masked_text` (dropping non-verbatim quotes).
    Scans reasons for digit runs $\ge 5$, URLs, and banned phrases (`safe`, `guaranteed`, `verified`,
    `নিরাপদ`, `গ্যারান্টি`). A banned phrase triggers a single retry with prompt correction; failure
    triggers safe fallback.
  - **Check Orchestrator (`pipeline/orchestrator.py`):** Consolidates all 13 pipeline steps in the
    exact order of Doc 02 Section 1 and Section 10.6. Implements context trimming (> 1500 chars keeps
    first 900 + last 500, sets `trimmed=True`), 1-hour duplicate `text_hash` cache (sets `reused=True`),
    spend cap ceiling, deterministic normalization & masking, hard rules bypass to `rules_only` template,
    Haiku triage, hybrid retrieval, Sonnet analysis, output validation, risk fusion table, safe actions
    resolution from `safe_actions.json`, and appending caution text.
  - **CLI (`pipeline/cli.py`):** Invoked via `python -m app.pipeline.cli "text"` (or `--json`).
  - **Verified:**
    - 11 new tests in `backend/tests/test_phase06_pipeline.py` passing 100%:
      - Zero unmasked numbers in outbound payloads (asserts raw BD mobile numbers never leave).
      - Fake quotes dropped (`quote=None`).
      - Invented helpline / invalid actions dropped.
      - Banned phrases detected, retried once, and succeeding on clean attempt.
      - Double failure fallback to safe fallback (S16).
      - Stop reason `refusal` triggering safe fallback.
      - Injected instructions treated as untrusted data with `manipulation_attempt` flagged.
      - Kill-key test triggers graceful fallback without crash.
      - Context trimming above 1500 chars verified.
      - 1-hour duplicate message reuse verified.
    - All 64 backend pipeline and deterministic tests pass cleanly in pytest.
    - All 25 Phase 06 and pipeline files are clean under Ruff (`ruff check` + `ruff format`).
    - 5 smoke checks executed across Bangla, English, and Banglish (Scenario 1 rules_only High,
      Scenarios 2-4 Medium fallback floor from soft rules, Scenario 5 Unavailable fallback from zero rules).
- [x] **Phase 07 — Check flows end to end.** Connect the user journey to the real
  pipeline with real data. _Done when:_ a guest gets a real Bangla result at 360 px,
  and failure simulation confirms Unavailable never shows Low.
  - **API Endpoints (`api/v1/checks.py`, `api/v1/public.py`, `services/checks.py`):**
    - `POST /check-message`: 10-4000 chars, extracts language, claimed sender, normalizes,
      masks PII (OTP/PIN/phones/names), runs deterministic rule engine, Haiku triage,
      hybrid retrieval, Sonnet analysis, and risk fusion table. Rate limited: 10/min, 60/day.
      Supports API key auth with `checks:write` scope (returns 403 when missing).
    - `POST /check-payment`: validates amount 1-10,000,000 BDT, normalizes BD recipient phone,
      evaluates `PaymentRiskModel` logistic regression, runs risk fusion, checks known confirmed
      risky numbers, updates `RiskyNumber` and `CheckNumber`. Rate limited: 10/min, 60/day.
    - `GET /checks`: user history with filters (`level`, `kind`, `limit`).
    - `GET /checks/{id}`: returns full check result, enforcing ownership for users and guests.
    - `DELETE /checks/{id}`: soft-deletes un-reported check (returns 409 if check has been reported as a case).
    - `POST /checks/{id}/report`: requires `consent: true` (422 if missing), idempotent (returns
      stable `PRO-XXXXXX` reference on repeat), and updates `RiskyNumber.report_count` in the same transaction.
    - `GET /safe-actions`: filters active actions by context (`before_payment`, `after_payment`, `both`) and provider.
    - `GET /samples`: retrieves simulated demo samples.
    - `GET /tips/current`: retrieves current weekly tip or 204.
  - **Frontend Core Journey (`routes/user/`, `routes/public/Landing.tsx`, `components/checks/`):**
    - **S01 Landing:** Hero, action buttons, dynamic "Try a sample" chips running the real pipeline.
    - **S09 Check Home:** Action cards (Message, Payment), urgent "Already sent money" row, weekly tip, recent checks.
    - **S10 Message Check:** 10-4,000 char validation, PIN/OTP warning banner, optional sender select, paste button, sample chips, preserves user text on failure.
    - **S11 Payment Check:** Amount (BDT), recipient status segmented control, channel chips, rushed toggle, provider select, preserves inputs on failure.
    - **S12 Checking:** Pipeline animation reflecting real deterministic steps.
    - **S13-S16 Result Screens (High, Medium, Low, Unavailable):**
      - The client **never computes risk**: renders exclusively what the server returns.
      - **Focus & Accessibility:** Automatically moves focus to the banner heading on load and enforces `aria-live="polite"` and `role="alert"`.
      - **High (S13):** Octagon badge, Pressure Pause 10-second countdown (F32), reasons, and primary helpline.
      - **Medium (S14):** Triangle warning badge, no pressure pause.
      - **Low (S15):** Info badge (NOT green), mandatory caution directly under headline ("কম ঝুঁকির অর্থ শতভাগ নিরাপদ নয় — সচেতন থাকুন").
      - **Unavailable (S16):** Neutral fallback banner ("We could not finish this check"), **never shows Low**.
      - **Helpline Action:** Verified number uses `tel:` (e.g., `tel:16247` for bKash). If unverified or provider missing, shows "Use the number in your provider's official app" (`official_app_helpline_notice`).
    - **HighlightedMessage (Scam Anatomy):** Underlines verified quotes (`border-b-2`) and reveals the flag reason popover on tap (`anatomy-popover`).
    - **S17 Report Modal:** Masked preview, optional 500-char note, required consent checkbox, displays reference `PRO-XXXXXX`.
    - **S19 History & S20 Check Detail:** Guest sign-in prompt, filter chips, check detail view with Delete confirmation modal (409 guard on reported checks).
  - **Verified:**
    - Backend: 138 pytest tests passing 100% (`test_checks_api.py`, `test_phase06_pipeline.py`, `test_auth.py`, `test_auth_security.py`, `test_pii_masking.py`, etc.).
    - Failure Simulation: `test_simulate_failure_unsetting_api_key_returns_unavailable_never_low` proves that unsetting/invalidating the API key triggers fallback with `is_fallback: True`, `final_level: None` (or Medium with 2+ soft rules), and **never shows Low**.
    - Frontend: 54 vitest tests passing 100% across all screens, components, and interactions.
    - Lint & Typecheck: `tsc --noEmit` clean; `eslint .` clean (0 errors, 0 warnings); backend `ruff check .` clean; `ruff format --check .` clean.
    - Production build: `npm run build` succeeds cleanly.
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
