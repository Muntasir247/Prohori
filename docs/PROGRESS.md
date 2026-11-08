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
- [x] **Phase 09 — Analytics, repeat numbers, campaigns.** Dashboard, repeat
  numbers, clustering, export, nightly job. _Done when:_ charts move after a
  decision, with no hard-coded chart data.
  - **Backend Analytics API (`api/v1/analytics.py`):**
    - `GET /analytics/overview`: returns live KPIs (`open_cases`, `high_today`, `median_time_to_decision`,
      `reviewer_agreement`), series for cases by risk level, top scam types (5 + Other), repeated risky numbers,
      reviewer decisions over time, and Campaign Radar (`surging_campaigns`). Seamlessly blends past
      `daily_aggregates` with today's live SQLite/Postgres rows. Supports date range, scam type, and risk filters.
    - `GET /analytics/numbers`: paginated repeat numbers list with 30-day sparklines, report counts, check counts,
      and high risk share.
    - `PATCH /analytics/numbers/{id}`: status updates (`watch`, `confirmed_risky`, `cleared`) strictly require a
      minimum 10-character reason and write an immutable audit log entry to `audit_events`.
  - **Campaigns API (`api/v1/campaigns.py`):**
    - `GET /campaigns`: lists scam campaigns with scam type mapping, member counts, 7-day velocity, and surging alerts.
    - `PATCH /campaigns/{id}`: supports renaming labels and merging clusters into target campaigns (moving member cases,
      deleting the merged source campaign, and logging to `audit_events`).
  - **Streaming CSV Export (`api/v1/cases.py`):**
    - `GET /cases/export.csv`: streams masked reviewed cases with UTF-8 BOM (`\xef\xbb\xbf`) for native Bengali support in Excel.
    - **Formula Injection Defense:** escapes any cell beginning with `=`, `+`, `-`, or `@` with a leading single quote (`'`).
    - Validates date range $\le 366$ days (returns 422 if exceeded) and writes an audit event before streaming.
  - **Clustering & Idempotent Nightly Job (`analytics/clusters.py`, `jobs/nightly.py`, `app/jobs/nightly.py`):**
    - Clusters 1024-dimensional semantic message embeddings using `sklearn.cluster.HDBSCAN(min_cluster_size=5)` with L2-normalized Euclidean metric.
    - `jobs/nightly.py`: 100% idempotent; deletes unreported guest checks older than 30 days first, recounts `risky_numbers`,
      rebuilds `daily_aggregates`, embeds reported masked messages, clusters embeddings, upserts campaigns preserving
      reviewer labels, and sets `is_surging` when `count_7d >= 10` and `count_7d >= 2 * prev_count_7d`.
    - Runnable standalone or via CLI `python -m jobs.nightly` (and `make nightly`).
  - **Frontend Reviewer Analytics & Recharts Isolation (`routes/review/`, `components/charts/`):**
    - **Strict Code-Splitting / No Public Import:** Recharts is never imported on public routes; all chart components
      (`CasesByRiskChart`, `TopScamTypesChart`, `RepeatNumbersChart`, `ReviewerDecisionsChart`, `SparklineChart`)
      are lazily loaded via `React.lazy()` under reviewer-gated routes.
    - **S24 Review Overview (`/review`):** 4 KPI stat cards, Campaign Radar alert banner for surging campaigns,
      filter bar with URL search params persistence (7d, 30d, 90d, custom), simulated data badge (`simulated-v1`),
      and 60-second background polling with a last-updated timestamp.
    - **Accessible Data-Table Toggles:** Every chart component includes an accessible toggle button (`aria-label="Toggle data table"`)
      switching between visualization and an accessible HTML table.
    - **Zero Mock / Fake Trends:** Empty states render explicitly when data is empty or filtered out.
    - **S27 Repeat Numbers (`/review/numbers`):** Table with monospace masked numbers, status filter, search,
      side drawer with 30-day sparkline, and status update modal enforcing audit reasons.
    - **S28 Scam Campaigns (`/review/campaigns`):** Card grid with surging badges, detail drawer with representative
      masked messages and shared numbers, rename modal, and merge campaign modal.
    - **S29 Reports & Export (`/review/reports`):** CSV export form with client-side 366-day range validation,
      compliance notices, and direct streaming download.
  - **Verified:**
    - Backend: 6 integration and unit tests passing in `tests/test_phase09_analytics.py`:
      - Exact match between API `/analytics/overview` and direct SQL fixture counts.
      - 100% idempotency of `jobs/nightly.py` and automatic deletion of 30-day-old guest checks.
      - Reviewer decisions cause live chart series and KPIs to move immediately.
      - Repeat numbers listing and status PATCH require a reason and write to audit.
      - Campaign listing, rename, and merge with audit verified.
      - CSV export streaming, UTF-8 BOM, Bangla Excel rendering, audit logging, and formula injection defense ($=$, $+$, $-$, $@$) verified.
    - CLI: `python -m jobs.nightly` executes cleanly and idempotently with 0 errors.
    - Frontend: 5 new tests in `src/features/analytics/analytics.test.tsx` (and all 59 vitest tests across frontend) passing 100%.
    - Production build: `npm run build` succeeds, generating isolated `CartesianChart` and reviewer chunks while keeping public chunks lean.
    - Code quality: `tsc --noEmit` clean, `eslint .` clean, `ruff check backend` clean, `ruff format --check backend` clean.
- [x] **Phase 10 — Differentiators.** Pressure Pause, sharing, Already Sent Money,
  read aloud. _Done when:_ all four work on a low-end Android Chrome profile.
  - **1. Pressure Pause (Doc 02 Feature F32, S13):**
    - Renders on **High risk results only** as a calm 10-second countdown card with message:
      *"Take a breath. Scammers want you to rush."* (*"এক মুহূর্ত থামুন। প্রতারকরা আপনাকে তাড়াহুড়ো করাতে চায়।"*).
    - **Prohori Never-Block Rule:** Result content, reasons, and actions remain visible and usable beneath;
      the countdown never traps or freezes user interaction.
    - **Accessibility & Motion:** Skip control is always present and keyboard/screen-reader reachable (`tabIndex={0}`, focus rings).
      Honors `prefers-reduced-motion: reduce` by disabling smooth CSS width animations.
    - **API & Telemetry:** `POST /api/v1/checks/{id}/pause-ack` records whether the countdown `finished` or was `skipped`
      into `checks.pause_outcome`. Non-blocking network errors are silently caught so user flow is never interrupted.
  - **2. Ask Someone You Trust / Share (Doc 02 Feature F33, S13, S21):**
    - **Backend Endpoints (`api/v1/shares.py`):**
      - `POST /api/v1/checks/{id}/share`: Generates a random 256-bit URL-safe token, stored only as a SHA-256 hash in the `shares`
        table. Expires in 24 hours. Automatically revokes prior active shares for the check.
      - `DELETE /api/v1/checks/{id}/share`: Immediately revokes all active shares for the check (`revoked_at = utcnow()`). Returns `204 No Content`.
      - `GET /api/v1/shares/{token}`: Sets `X-Robots-Tag: noindex, nofollow` to prevent search engine indexing.
      - **Token Probing Defense:** Invalid, revoked, and expired tokens return an identical `410 Gone` response with error code
        `share_expired_or_invalid`, preventing attackers from probing token existence.
    - **Strict Privacy / Zero Leakage Rule:** Shared response payload and view never expose check UUIDs, user IDs, accounts,
      personal names, raw phone numbers, or unmasked text. Only masked text, level, reasons, and generic safe actions are exposed.
    - **UI & Web Share API:** In `Result.tsx`, "Ask someone you trust" invokes the native Web Share API (`navigator.share`)
      when supported, falling back to a copyable modal with clipboard write and a one-click "Revoke link" button.
    - **S21 Shared Result (`/s/:token`):** Public reader view with no AppShell, displaying the masked message, reasons,
      safe actions, 24-hour expiration notice, and calm expired state with link to check own message.
  - **3. Already Sent Money (Doc 02 Feature F34, S18):**
    - **Public Emergency Reader (`routes/user/AlreadySent.tsx`, `/already-sent`):** Open to anyone without requiring an account or check.
    - **Headline:** *"Act now. Do this first."* (*"দেরি করবেন না। এখনই এই পদক্ষেপগুলো নিন।"*).
    - **Mandatory Honest Line:** *"Recovery is not guaranteed. Calling quickly gives the best chance."*
      (*"টাকা ফেরত পাওয়ার নিশ্চয়তা নেই। তবে দ্রুত ফোন করলে সুযোগ সবচেয়ে বেশি।"*). Never falsely promises recovery.
    - **4 Ordered Emergency Steps:**
      1. *Call provider helpline:* Interactive provider picker (bKash: `16247`, Nagad: `16167`, Rocket: `16216`, Upay: `16268`, Bank/Other: `999`)
         with large direct `tel:` call button and query parameter support (`?provider=nagad` preselection).
      2. *Keep transaction ID and screenshots:* Do not delete SMS or chats; save TrxID.
      3. *Do not pay recovery scammers:* Explicit warning that advance recovery fees are another scam.
      4. *Report to official law enforcement:* Direct buttons to Emergency `999` and CID Cyber Police `01320010148`.
    - **Service Worker Offline Cache (`public/sw.js`):** Lightweight service worker pre-caches `/already-sent` and
      `GET /api/v1/safe-actions?context=after_payment`. Registered in `main.tsx`. UI provides embedded fallback steps so the guide
      functions immediately and reliably even offline on low-end Android Chrome profiles.
  - **4. Read Aloud (Doc 02 Feature F37, S13):**
    - Browser `window.speechSynthesis` with strict feature and voice detection.
    - **Omission Rule:** The "Read aloud" button is **completely hidden from the DOM** when no `bn-BD` or `bn-IN` voice exists
      in Bengali mode, or when `SpeechSynthesisUtterance` is unavailable.
    - When a matching voice is available, speaks the risk rating, reasons, and next safe actions, with stop/cancel controls.
  - **Verified:**
    - Backend: 4 integration tests passing in `tests/test_phase10_differentiators.py`:
      - `POST /checks/{id}/pause-ack` with finished/skipped recorded in DB.
      - 24h share token lifecycle, `X-Robots-Tag: noindex, nofollow`, and token probing defense (invalid, expired, and revoked all return 410).
      - Zero leakage test: confirms no check UUID, user ID, unmasked numbers, or names in shared data.
      - `GET /safe-actions?context=after_payment` accessible without login.
    - Frontend: 9 integration tests in `src/features/checks/differentiators.test.tsx` (and all 68 vitest tests across frontend) passing 100%:
      - PressurePause countdown, keyboard skip, reduced motion, and ack dispatch.
      - Share link generation, copy to clipboard, and revocation.
      - SharedResult reader view zero-leakage DOM verification and 410 expired state.
      - AlreadySent 4 ordered steps, honest reality check line, provider picker switching hotlines, and preselection via query params.
      - Read aloud button hiding when voice is absent, and speaking/stopping when present.
    - Production build: `npm run build` succeeds cleanly with `dist/sw.js` emitted.
    - Code quality: `tsc --noEmit` clean (0 errors), `eslint .` clean (0 problems), `ruff check backend` clean (0 errors), `ruff format --check backend` clean.
- [x] **Phase 11 — Admin and partner API.** Admin screens and partner keys.
  _Done when:_ publishing a pattern changes retrieval results.
  - **1. Knowledge Base (Doc 01 S30, Doc 02 Feature F24):**
    - Manage verified scam-pattern documents with code, title, scam category, language (bn/en/banglish), source URL, and body.
    - Publishing triggers semantic chunking (200–400 tokens with 40-token overlap) and vector store embedding (`app/pipeline/retrieval.py`).
    - Failure safety: embedding failure leaves document in `Draft` with `Retry` action; successful publish updates chunks and instantly reloads the retrieval engine so subsequent check queries retrieve the newly published knowledge pattern.
  - **2. Safe Actions & Helplines (Doc 01 S31, Doc 02 Feature F24):**
    - Safe actions CRUD (`/api/v1/admin/safe-actions`).
    - **Database & API Verification Enforcement:** Helplines with phone numbers cannot be active without `source_url` and `verified_at` (enforced via database `CheckConstraint("phone_needs_source")` and API `422 unverified_helpline`).
    - **90-Day Warning:** Automated calculation flags any helpline whose `verified_at` date exceeds 90 days (`needs_reverification = True`), rendering a prominent warning badge and re-verification alert banner.
  - **3. Quality & Evaluation Harness (Doc 01 S32, Doc 02 Feature F25, Section 10.7):**
    - Reads `eval_runs` history, route traffic mix (message vs payment), token metrics (input, output, cache read tokens), and Anthropic prompt cache hit rate.
    - **Section 10.7 Prompt Activation Gate:** `POST /api/v1/admin/prompts/{id}/activate` strictly enforces production guardrails (`high_precision >= 0.90`, `high_recall >= 0.85`, `genuine_high_rate <= 0.03`, and `unsafe_flags == 0`). If targets fail or unsafe flags exist, activation aborts with `409 eval_gate_failed`.
    - Prominently labeled notice on UI and API: `"Measured on simulated data only (simulated-v1)"`.
  - **4. User & Role Management (Doc 01 S33, Doc 02 Feature F29):**
    - Staff user management with single-use 48-hour invitation links (`POST /api/v1/admin/users/invite`).
    - Role modifications (`user`, `reviewer`, `admin`) and account deactivations.
    - **Session Revocation Rule:** Role changes and deactivations immediately revoke all active sessions for that user for security.
    - **Last Admin Protection:** The API and UI strictly protect the last remaining active administrator, blocking demotion or deactivation with `409 last_admin`.
  - **5. Partner API & Authentication Sandbox (Doc 01 S34, Doc 02 Feature F15, F30):**
    - Cryptographic key generation for partners (`prh_live_` or `prh_test_` + 32 random bytes).
    - **Zero Raw Key Storage:** Raw keys are displayed **only once** upon generation with copy utility; database stores strictly SHA-256 digests (`key_hash`).
    - `ApiKeyMiddleware` (`app/middleware/api_key.py`): extracts Bearer token or `X-API-Key`, validates SHA-256 hash, enforces per-key rate limits via sliding window counter, updates `last_used_at`, and sets request scopes (`checks:write`, `cases:read`).
    - Three partner endpoints documented in OpenAPI `/docs` with labeled simulated-data notices and `Partner` tags:
      1. `POST /api/v1/check-message` (scope `checks:write`)
      2. `POST /api/v1/check-payment` (scope `checks:write`)
      3. `GET /api/v1/cases` (scope `cases:read`)
  - **6. Audit Log (Doc 01 S35, Doc 02 Feature F17):**
    - Strictly read-only, append-only immutable audit trail.
    - Captures actor ID, actor role, action, target entity, request ID, before & after state payloads.
    - Filterable by actor, action, date range, with before/after JSON diff drawer. Admins cannot edit or delete audit logs (no update/delete routes exist).
  - **Verified:**
    - **Automated Role Denial Test:** `test_role_denial_on_every_admin_route_automatically` automatically iterates every single route registered under `/api/v1/admin/*` and asserts that Reviewers receive `403 Forbidden`.
    - **Backend Integration Tests:** 7 tests in `backend/tests/test_phase11_admin.py` and 41 total backend tests passing:
      - Publishing pattern updates retrieval results.
      - Unverified helpline rejected (422) + 90-day warning calculation.
      - API key creation, single exposure, SHA-256 storage, per-key rate limiting, and scope validation.
      - Quality page metrics and 409 eval gate rejection.
      - User invitations, session revocation on role change, and last admin protection (409).
      - Audit log read-only integrity.
    - **Frontend Integration Tests:** 6 tests in `frontend/src/features/admin/admin.test.tsx` and 74 total frontend tests passing:
      - S30 Knowledge Base pattern listing, creation, and publish chunk update.
      - S31 Safe Actions client validation blocking unverified helpline activation and 90-day warning banner.
      - S32 Quality KPI display, simulated data notice, and 409 eval gate error alert.
      - S33 Users invite link generation and last admin protection alert.
      - S34 Partner API Keys creation, single raw key display modal, and placeholder curl snippet.
      - S35 Audit log immutable trail and before/after JSON diff inspection drawer.
    - **Build & Quality:** `npm run build` succeeds cleanly; `tsc --noEmit` clean; `eslint .` clean; `ruff check backend` clean; `ruff format --check backend` clean.
- [ ] **Phase 12 — Evaluation.** Measure quality and stop regressions. _Done when:_
  thresholds and unsafe gate enforced.
- [ ] **Phase 13 — Hardening.** Security, Bangla, accessibility and responsive pass.
  _Done when:_ every R-item has a test or a documented reason.
- [ ] **Phase 14 — Deployment, demo and submission.** Live demo link, video and
  final form check. _Done when:_ demo works twice in a row, and form answers match
  what was built.
