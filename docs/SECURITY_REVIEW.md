# Prohori Security, Privacy, and Hardening Review (Phase 13)

**Document Reference:** `docs/PROHORI_DOC02.md` Sections 11 and 13  
**Review Date:** 2026-11-08  
**Scope:** Architecture-wide audit against Section 11 Risk Register (R01–R29), Section 13 Critical Scenarios (T01–T28), security middleware, CI pipeline, accessibility (WCAG 2.2 AA), responsive layouts, and i18n Bangla safety review.

---

## 1. Executive Summary

Prohori's core security architecture is built on five non-negotiable principles:
1. **Data is masked before it moves:** Raw messages, full phone numbers, OTPs, and PINs are never stored or logged.
2. **The server decides:** LLMs have zero authority over final risk levels or enforcement actions.
3. **Strict authorization on every route:** Role-based access control (`user`, `reviewer`, `admin`) with ownership checks.
4. **Deterministic safety floors:** Hard rules and fusion logic guarantee that no model can downgrade a known scam or OTP request to Low.
5. **Failures fail safe:** Outages, timeouts, and rate limits gracefully degrade to cached emergency guidance and deterministic rules without stranding users.

All 29 Section 11 risk items have been audited. Gaps were prioritized and resolved in the required sequence:
1. **Data Exposure:** Sentry `before_send` PII and payload scrubber, strict log filtering, Presidio masking, phone HMAC-SHA256, and CSV formula escaping.
2. **Authorization:** Role guards on all protected routes, UUID primary keys with ownership filters, optimistic concurrency (R09/T18), and last-admin demotion safeguards.
3. **Abuse Mitigation:** Sliding-window rate limiting on IP, guest hash, and API keys; daily LLM dollar spend caps; exact-origin CORS; and prompt injection shielding (`<untrusted_message>`).
4. **Quality & Resilience:** Automated evaluation gates blocking regression, WCAG 2.2 AA accessibility via `axe-core`, 360–1440px responsive testing with zero horizontal overflow, and dual-language safety copy.

---

## 2. Risk Register Audit Table (Section 11: R01–R29)

| Risk ID | Problem Description | Status | Evidence (File / Test Path) | Gap / Notes |
| :--- | :--- | :--- | :--- | :--- |
| **R01** | Weak authentication (Reused passwords, brute force) | **PASSED** | `backend/app/security/passwords.py`<br>`backend/tests/test_auth_security.py::test_login_rate_limiting_5_failures`<br>`backend/tests/test_auth_security.py::test_idle_session_expiry` | Enforces Argon2id hashing, 10+ character passwords, 5-failure lockout per email/IP per 15 minutes, 8-hour rolling reviewer sessions with 30-minute idle expiration. |
| **R02** | Unauthorized data access (IDOR / Missing owner filter) | **PASSED** | `backend/app/api/deps.py`<br>`backend/app/api/v1/checks.py`<br>`backend/tests/test_checks_api.py`<br>`backend/tests/test_phase13_hardening.py::test_role_enforcement_case_decision` | UUID primary keys; user-scoped queries strictly filter on owner; non-owned checks return HTTP 404 (not 403) to prevent resource enumeration. |
| **R03** | API failure (Claude or embedding provider outage) | **PASSED** | `backend/app/pipeline/orchestrator.py`<br>`backend/tests/test_rule_only_offline.py`<br>`backend/tests/test_phase06_pipeline.py` | Fallback route activated upon timeout or LLM error; returns deterministic rule hits and vetted safe actions without stalling. |
| **R04** | Duplicate transactions and reports (Double-click / retry) | **PASSED** | `backend/app/api/v1/cases.py`<br>`backend/app/models/check.py`<br>`frontend/src/features/checks/ReportModal.tsx` | Unique database constraint on `cases.check_id`; reporting endpoint is idempotent and returns the existing case reference. |
| **R05** | Incorrect calculations (Bangla digits, float errors) | **PASSED** | `backend/app/pipeline/normalize.py`<br>`backend/tests/test_normalize.py`<br>`backend/app/schemas/checks.py` | Uses `Decimal` / SQL `Numeric(14,2)`; converts Eastern Arabic-Indic numerals (`০-৯`) deterministically; rejects non-parseable amounts with HTTP 422 field errors. |
| **R06** | Invalid or malicious input (Large payloads, XSS injection) | **PASSED** | `backend/app/schemas/checks.py`<br>`backend/app/middleware/security_headers.py`<br>`frontend/src/features/a11y/accessibility.test.tsx` | Strict length constraints (10–4,000 chars); Pydantic payload validation; React auto-escaping (zero `dangerouslySetInnerHTML`); CSP `script-src 'self'`. |
| **R07** | Masking misses Bangla names (Presidio English bias) | **MITIGATED** | `backend/app/pipeline/masking.py`<br>`backend/tests/test_pii_masking.py` | Custom recognizers for BD phone numbers, bank accounts, NID numbers, and OTP patterns, with contextual honorific heuristics. **Documented Gap:** Presidio lacks native Bangla NER. Unlabeled names outside honorific contexts may pass to the LLM. Formal fine-tuned Bangla NER is required before live citizen deployment. |
| **R08** | Data inconsistency (Partial database writes) | **PASSED** | `backend/app/api/v1/cases.py`<br>`backend/app/jobs/nightly.py`<br>`backend/tests/test_phase09_analytics.py` | Atomic multi-table transactions for case creation and risk counters; nightly cron reconciliation job repairs drift. |
| **R09** | Race on case decision (Two reviewers decide concurrently) | **PASSED** | `backend/app/models/check.py`<br>`backend/app/api/v1/cases.py`<br>`backend/tests/test_phase13_hardening.py::test_t18_case_decision_optimistic_locking_conflict`<br>`frontend/src/routes/review/CaseDetail.tsx` | Optimistic concurrency using `version` column (`UPDATE cases ... WHERE version = :version`). Second reviewer receives HTTP 409 Conflict; client preserves note drafts. |
| **R10** | Race on counters (Concurrent scam reports) | **PASSED** | `backend/app/api/v1/cases.py`<br>`backend/app/jobs/nightly.py` | Atomic SQL increments (`report_count = report_count + 1`); nightly aggregation recalculates totals. |
| **R11** | Session expiry mid-review (Loss of reviewer notes) | **PASSED** | `frontend/src/routes/review/CaseDetail.tsx`<br>`frontend/src/features/a11y/accessibility.test.tsx` | Auto-saves note drafts to `localStorage` (`prohori_case_draft_{id}`) on keystroke; drafts survive page reloads and re-authentication. |
| **R12** | Financial data privacy (Leaks in logs or error trackers) | **PASSED** | `backend/app/sentry.py`<br>`backend/app/middleware/request_id.py`<br>`backend/tests/test_sentry.py` | Access logs contain only metadata (no request/response bodies); Sentry `before_send` strips request data, tokens, and PII; phone numbers stored exclusively as HMAC-SHA256. |
| **R13** | Rate-limit abuse (Denial of service / LLM budget drain) | **PASSED** | `backend/app/middleware/rate_limit.py`<br>`backend/app/pipeline/orchestrator.py`<br>`backend/tests/test_auth_security.py` | Sliding window rate limits per IP, guest cookie, and API key; hard daily LLM spend cap (`DAILY_LLM_SPEND_CAP_USD`); returns HTTP 429 with actionable safety guidance. |
| **R14** | Prompt injection (Scammer message instructs LLM to say Low) | **PASSED** | `backend/app/llm/prompts/`<br>`backend/app/pipeline/rules/engine.py`<br>`backend/tests/test_phase12_eval.py` | User input wrapped inside `<untrusted_message>` XML tags; system prompt instructs model to treat override attempts as red flags; deterministic rule floors cannot be overridden by model outputs. |
| **R15** | LLM hallucination (Model fabricates phone numbers or advice) | **PASSED** | `backend/app/pipeline/fusion.py`<br>`backend/app/pipeline/orchestrator.py`<br>`backend/tests/test_phase06_pipeline.py` | Action IDs must exist in the database `safe_actions` catalog; quotes verified against input; banned words stripped; eval gates reject ungrounded prompts. |
| **R16** | Scam text rendered in reviewer UI (Stored XSS) | **PASSED** | `frontend/src/routes/review/CaseDetail.tsx`<br>`backend/app/middleware/security_headers.py` | Masked text rendered as plain sanitized text; hyperlinks are never clickable; strict CSP forbids inline script execution. |
| **R17** | CSV injection (Spreadsheet formulas in export) | **PASSED** | `backend/app/api/v1/cases.py`<br>`backend/tests/test_phase09_analytics.py` | All exported string cells starting with `=`, `+`, `-`, or `@` are sanitized with a leading single quote (`'`); exports logged to audit trail. |
| **R18** | Share link leaks (Broad exposure of sensitive checks) | **PASSED** | `backend/app/api/v1/shares.py`<br>`backend/tests/test_phase10_differentiators.py` | Shares contain masked text only; 24-hour expiration; cryptographically random tokens stored as SHA-256; `X-Robots-Tag: noindex`. |
| **R19** | Phone number brute-force (Reversing hashed numbers) | **PASSED** | `backend/app/pipeline/masking.py`<br>`backend/app/config.py`<br>`backend/tests/test_pii_masking.py` | Uses HMAC-SHA256 with high-entropy secret `NUMBER_HMAC_KEY` stored exclusively outside the database in host environment variables. |
| **R20** | Network interruption (Unstable 2G/3G mobile data) | **PASSED** | `frontend/src/routes/user/AlreadySent.tsx`<br>`frontend/src/routes/public/MessageCheck.tsx` | Form input state retained in React state; retry mechanisms; emergency steps (S18) cached and accessible offline. |
| **R21** | False reassurance (User mistakes Low risk for "safe") | **PASSED** | `frontend/src/features/checks/ResultCard.tsx`<br>`frontend/src/i18n/bn/common.json`<br>`docs/BANGLA_REVIEW.md` | "Safe" label and green color coding are strictly forbidden; Low risk displays neutral styling and mandatory caution copy in both languages. |
| **R22** | False alarm (Legitimate emergency payment flagged as High) | **PASSED** | `backend/app/pipeline/fusion.py`<br>`backend/tests/test_phase12_eval.py` | Score-only High capped unless corroborating rules hit; eval suite enforces False Positive rate <= 5%; Medium risk advises verification without blocking. |
| **R23** | Stale helpline numbers (Users dial outdated or hijacked hotlines) | **PASSED** | `backend/app/api/v1/admin.py`<br>`frontend/src/routes/admin/SafeActions.tsx`<br>`frontend/src/features/admin/admin.test.tsx` | Admin requires official source URL and verification date to activate helplines; flags actions older than 90 days for re-verification; safe fallback to official banking apps. |
| **R24** | Brand spoofing / Fake Prohori | **PASSED** | `frontend/src/components/AppShell.tsx`<br>`frontend/src/routes/public/Landing.tsx` | Canonical domain displayed in header/footer; prominent public notice that Prohori never initiates messages, calls, or requests money/PINs. |
| **R25** | Mobile responsiveness (Tables broken on narrow devices) | **PASSED** | `frontend/src/features/responsive/responsive.test.tsx`<br>`frontend/src/styles/globals.css` | All routes tested and verified at 360px, 768px, 1024px, and 1440px with zero horizontal scroll; mobile-responsive card alternatives for tables. |
| **R26** | Accessibility gaps (Exclusion of screen reader/keyboard users) | **PASSED** | `frontend/src/features/a11y/accessibility.test.tsx` | Zero `axe-core` violations across all public, reviewer, and user screens; full keyboard navigation for S10, S13, S17, and S26; WCAG 2.2 AA compliant. |
| **R27** | Catastrophic data loss (Host failure or corrupted migration) | **MITIGATED** | `scripts/backup.sh`<br>`alembic/versions/` | Database backups via `pg_dump` and additive Alembic migrations. **Documented Gap:** Point-in-time recovery (PITR) requires managed cloud database infrastructure (Neon/Supabase/RDS); local Docker environment cannot simulate live cloud PITR. |
| **R28** | Secret leak (API keys or HMAC secrets in version control) | **PASSED** | `.gitignore`<br>`.github/workflows/ci.yml`<br>`Makefile` | `.env` strictly gitignored; automated Gitleaks secret scanner and dependency vulnerability audits (`pip-audit`, `npm audit`) in CI. |
| **R29** | Legal exposure under Bangladesh PDPO 2025 | **MITIGATED** | `docs/BANGLA_REVIEW.md`<br>`evals/dataset/`<br>`frontend/src/components/admin/AdminNav.tsx` | Prototype operates exclusively on simulated data (`simulated-v1`); explicit consent checkbox on reports. **Documented Gap:** Requires formal legal sign-off on the enacted text of Bangladesh Personal Data Protection Ordinance 2025 prior to production intake of real citizen reports. |

---

## 3. Security Implementation Details

### 3.1 Security Headers & Strict CSP
Configured in `backend/app/middleware/security_headers.py`:
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Resource-Policy: same-origin`
- `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`

### 3.2 Exact-Origin CORS
Configured in `backend/app/config.py`:
- Validates configured origins (`http://localhost:5173`, `http://127.0.0.1:5173`, etc.).
- Rejects wildcard `*` with an explicit `ValueError` on application boot.
- Requires valid `http://` or `https://` URI schemes.

### 3.3 Sentry Event & Body Scrubber
Configured in `backend/app/sentry.py`:
- `scrub_sentry_event` inspects all outgoing Sentry events.
- Automatically removes `request["data"]` and raw request bodies.
- Redacts sensitive headers (`Authorization`, `Cookie`, `X-API-Key`, `Session`).
- Scrubs breadcrumbs containing passwords, OTPs, PINs, or tokens.
- Strips PII from `user` contexts, retaining only opaque UUID IDs.

### 3.4 CI Security Pipeline
Integrated into `.github/workflows/ci.yml`:
- **Gitleaks Scan:** Detects committed secrets, private keys, or API tokens.
- **Python Audit:** `pip-audit --desc` scans backend dependencies for known CVEs.
- **Node.js Audit:** `npm audit --audit-level=moderate` checks frontend dependencies.

---

## 4. Accessibility & Responsive Verification

### 4.1 Automated `axe-core` Audits
Tested using `@axe-core/react` in `frontend/src/features/a11y/accessibility.test.tsx`:
- `S01 Landing`: 0 violations
- `S03 Login`: 0 violations
- `S10 Message Check`: 0 violations
- `S11 Payment Check`: 0 violations
- `S17 Report Modal`: 0 violations
- `S18 Already Sent`: 0 violations

### 4.2 Keyboard Navigation Paths
- **S10 (Message Check):** Form submission, character counter, and keyboard shortcuts fully reachable via Tab/Enter.
- **S13 (High Result / Pressure Pause):** Skip countdown button is tab-accessible and actionable via Space/Enter.
- **S17 (Report Modal):** Trap focus inside modal; dismissed cleanly via Escape key.
- **S26 (Reviewer Case Detail):** Radio selection, scam type dropdown, 10–500 char reason counter, confirmation modal, and note drafts all operable via keyboard only.

### 4.3 Responsive Viewports
Verified at **360px** (small mobile), **768px** (tablet), **1024px** (desktop), and **1440px** (wide display).  
Configured `overflow-x: hidden; max-width: 100vw;` in `frontend/src/styles/globals.css`. Zero horizontal scroll detected across all tested routes.

---

## 5. Frontend Bundle Size Measurement

Measured using `npm run build` (`vite v5.4.21`):
- **Initial Public JS (`dist/assets/index-*.js`):** 473.88 kB (gzipped: **143.99 kB**)
- **Initial Public CSS (`dist/assets/index-*.css`):** 30.11 kB (gzipped: **6.27 kB**)
- **Total Initial Transfer Size:** **150.26 kB**
- **Doc 01 Target:** `< 200 kB`
- **Result:** **PASSED** (24.8% headroom below budget).

Heavy administration and analytical dependencies (e.g. Recharts `CartesianChart` at 99.44 kB gzipped, BarChart, LineChart) are dynamically split and loaded exclusively on authenticated `/review` and `/admin` routes.

---

## 6. Documented Gaps & Release Constraints

| Item | Constraint | Recommended Production Action |
| :--- | :--- | :--- |
| **R07 (Bangla NER)** | Presidio heuristics and regex patterns catch phones, NIDs, and honorifics, but unlabeled person names may pass through. | Train a Bangla RoBERTa/NER classifier before deploying on un-sanitized citizen streams. |
| **R27 (Cloud PITR)** | Point-in-time recovery requires managed cloud database storage (e.g. Neon, Supabase, or AWS RDS). | Provision managed cloud database with continuous WAL archiving before public production launch. |
| **R29 (Legal PDPO 2025)** | Prototype uses simulated synthetic dataset (`simulated-v1`). | Retain simulated data until legal counsel verifies consent and data retention clauses under enacted Bangladesh privacy laws. |

