# Prohori Production Deployment Guide

This guide details the exact, step-by-step procedure for deploying Prohori to production using **Vercel** (Frontend SPA), **Render** (Dockerized FastAPI backend & Nightly cron), and **Neon** or **Supabase** (PostgreSQL 16 with `pgvector`).

---

## 1. Architecture Overview

```
[ Mobile Browser / Client ]
            │
            ▼
┌─────────────────────────┐
│     Vercel (Edge)       │
│  - Vite React SPA       │
│  - SPA fallback: /*     │
│  - Proxy: /api/*  ──────┼────────────┐ (Rewritten to Render backend)
└─────────────────────────┘            │
                                       ▼
                         ┌───────────────────────────┐
                         │   Render (Singapore)      │
                         │   - Plan: Starter (1 GB)  │
                         │   - FastAPI (Docker)      │
                         │   - Pre-deploy: Alembic   │
                         │   - Health: /api/v1/health│
                         └─────────────┬─────────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    ▼                                     ▼
        ┌───────────────────────┐             ┌───────────────────────┐
        │     External APIs     │             │ Neon / Supabase (SG)  │
        │ - Anthropic (Claude)  │             │ - PostgreSQL 16       │
        │ - Voyage AI (Embed)   │             │ - pgvector, pg_trgm   │
        │ - Sentry (PII scrub)  │             │ - 24 Tables + Triggers│
        └───────────────────────┘             └───────────────────────┘
```

> [!IMPORTANT]
> **Zero Sleeping Free-Tier Rule:** Render's free tier sleeps after 15 minutes of inactivity, adding 50+ second cold-start delays. Prohori requires an always-on **Starter** plan (1 GB RAM minimum) to guarantee instant responses during live reviews and scam checks.

---

## 2. Managed Database Provisioning (Neon or Supabase)

### Option A: Neon Serverless Postgres (Recommended)
1. Sign in to [Neon Console](https://console.neon.tech/) and create a project named `prohori-prod`.
2. **Region:** Select **Singapore (`ap-southeast-1`)** (closest to Bangladesh for low network latency).
3. **PostgreSQL Version:** Ensure version **16** is selected.
4. **Enable Required Extensions:** Open the Neon SQL Editor and execute:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   CREATE EXTENSION IF NOT EXISTS pg_trgm;
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   CREATE EXTENSION IF NOT EXISTS btree_gin;
   ```
5. **Connection Strings:**
   - **Direct Connection (Migrations & Backend):**
     `postgresql+asyncpg://<user>:<password>@<neon-host>/prohori-prod?ssl=require`
   - **Pooled Connection:** Used if connection pooling is enabled. For Alembic migrations, always use the direct (non-pooled) host.

### Option B: Supabase
1. Sign in to [Supabase](https://supabase.com/) and create a project named `prohori-prod` in Singapore.
2. Under **Database -> Extensions**, enable:
   - `vector` (pgvector)
   - `pg_trgm`
   - `uuid-ossp`
   - `btree_gin`
3. Connection string format under Project Settings -> Database:
   - Use Session mode (Port 5432) or Transaction mode (Port 6543 with `prepared_statement_cache_size=0`).
   - Direct: `postgresql+asyncpg://postgres.<ref>:<password>@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?ssl=require`

---

## 3. Backend Deployment on Render

Deploy using the infrastructure blueprint `render.yaml` or through the Render Dashboard:

### Blueprint Deployment
1. Connect the GitHub repository in [Render Dashboard](https://dashboard.render.com/).
2. Select **New -> Blueprint** and point to `render.yaml`.
3. Render automatically provisions:
   - **`prohori-backend`**: Docker Web Service on Starter plan (1 GB RAM, 1 CPU).
   - **`prohori-nightly`**: Cron job scheduled at `0 20 * * *` (02:00 AM BST).

### Manual Service Configuration
- **Runtime:** `Docker`
- **Dockerfile Path:** `./backend/Dockerfile`
- **Docker Context:** `./backend`
- **Instance Type:** `Starter` ($7/mo, 1 GB RAM, 1 CPU — always-on).
- **Region:** `Singapore`
- **Pre-Deploy Command:**
  ```bash
  alembic upgrade head
  ```
- **Health Check Path:**
  ```
  /api/v1/health
  ```
- **Cron Job Command (`prohori-nightly`):**
  ```bash
  python -m app.jobs.nightly
  ```

---

## 4. Production Environment Variables

Configure the following environment variables on the backend service in Render. **Never hard-code or commit real values.**

| Variable Name | Required | Example / Description |
| :--- | :---: | :--- |
| `ENVIRONMENT` | Yes | `production` |
| `DATABASE_URL` | Yes | `postgresql+asyncpg://<user>:<secret>@<host>/<db>?ssl=require` |
| `APP_ORIGIN` | Yes | Production frontend origin, e.g. `https://prohori.vercel.app` |
| `CORS_ORIGINS` | Yes | `["https://prohori.vercel.app"]` (Exact origins only, no wildcard `*`) |
| `ANTHROPIC_API_KEY` | Yes | Claude API Key for Haiku 5.5 and Sonnet 5.5 analysis |
| `VOYAGE_API_KEY` | Yes | Voyage AI key for 1024-dim knowledge vector embeddings |
| `NUMBER_HMAC_KEY` | Yes | 64-char random hex string (`openssl rand -hex 32`) for keyed phone masking |
| `SESSION_SECRET` | Yes | 64-char random hex string (`openssl rand -hex 32`) for auth sessions |
| `EMAIL_DRIVER` | Yes | `console` (default) or `resend` |
| `RESEND_API_KEY` | Conditional | Required if `EMAIL_DRIVER=resend` for transactional invite emails |
| `SENTRY_DSN` | Optional | Sentry monitoring DSN (PII scrubber strips message bodies) |
| `DAILY_LLM_SPEND_CAP_USD` | Yes | `25.0` (Hard spend safety ceiling per Doc 02 Section 10) |
| `LOG_LEVEL` | Yes | `INFO` |

---

## 5. Production Database Seeding

Once Alembic migrations complete successfully, populate the reference knowledge base, verified safe actions, and simulated demo accounts:

1. In Render Shell (or connected secure CLI session), set the demo reviewer passwords as environment variables:
   ```bash
   export SEED_USER_PASSWORD="<choose-secure-password-10-chars>"
   export SEED_REVIEWER_PASSWORD="<choose-secure-reviewer-password>"
   export SEED_ADMIN_PASSWORD="<choose-secure-admin-password>"
   ```
2. Execute the idempotent production seed:
   ```bash
   python scripts/seed.py
   ```
3. **What this executes:**
   - Creates `reviewer@prohori.test` and `admin@prohori.test` staff accounts.
   - Loads 6 verified scam pattern chunks and pre-computed embeddings.
   - Seeds verified `safe_actions` (bKash helpline 16247 active; unverified lines inactive).
   - Generates 500 simulated checks and 120 simulated cases tagged `simulated-v1`.
   - **Prints zero passwords or secret keys.**

---

## 6. Frontend Deployment on Vercel

1. In [Vercel Dashboard](https://vercel.com/), select **Add New Project** and link the repository.
2. **Build & Development Settings:**
   - **Framework Preset:** `Vite`
   - **Root Directory:** `frontend` (or repository root using `vercel.json`)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
3. **Environment Variables:**
   - `VITE_APP_ENV`: `production`
4. **Vercel Rewrites & SPA Routing (`vercel.json`):**
   The deployed `vercel.json` automatically:
   - Routes all `/api/*` requests directly to the Render backend (`https://prohori-backend.onrender.com/api/$1`).
   - Keeps all session cookies (`__Host-prohori_session`) **same-origin**, preventing cross-site cookie restrictions.
   - Enforces SPA fallback to `/index.html` for clean client routing.

---

## 7. Backups and Disaster Recovery

### Automated Backups
- **Neon:** Neon automatically captures continuous WAL logs and maintains 7-day point-in-time restore capability. Instant zero-copy database branches can be spun up for emergency staging recovery.
- **Supabase:** Daily automated backups stored with physical point-in-time recovery (PITR).

### Manual Snapshot Procedure
To take an immutable pre-release snapshot of production data:
```bash
pg_dump -d "$DATABASE_URL" \
  --format=custom \
  --file="prohori_backup_$(date +%Y%m%d_%H%M%S).dump" \
  --exclude-table-data=sessions \
  --exclude-table-data=rate_limit_counters
```
> [!NOTE]
> Ephemeral rate-limit counters and active session tokens are excluded from physical cold backups to prevent session hijacking if a dump file is compromised.

---

## 8. Rollback Procedures

### Frontend Rollback (Vercel)
Vercel keeps immutable preview and production deployments:
1. In Vercel Dashboard -> **Deployments**, locate the last known healthy deployment.
2. Click **Instant Rollback** (or three dots -> **Promote to Production**).
3. The rollback propagates globally in `< 5 seconds`.

### Backend Service Rollback (Render)
1. In Render Dashboard -> `prohori-backend` -> **Deploys**.
2. Locate the prior successful deploy commit.
3. Click **Rollback to this deploy**.
4. Render immediately switches traffic to the previous Docker image.

### Database Migration Rollback (Alembic)
If a database migration introduced an incompatible schema:
1. Connect to the Render service shell:
   ```bash
   alembic downgrade -1
   ```
2. Or rollback to a specific revision:
   ```bash
   alembic downgrade 0001_core_schema
   ```
3. Both migrations `0001_core_schema` and `0002_knowledge_safety_operations` feature fully tested reverse-order cascades that cleanly remove tables, sequences, functions, and enum types without data corruption.

---

## 9. Verification & Smoke Test

Immediately following deployment, run the automated smoke verification script against the production URL:

```bash
python scripts/smoke.py --base-url https://prohori.vercel.app
```

The script verifies:
1. `GET /api/v1/health` -> DB responds with status `ok` and version.
2. `POST /api/v1/check-message` -> Real Bangla scam check evaluates to `High` with safe actions.
3. `POST /api/v1/checks/{id}/report` -> Generates tracking reference `PRO-XXXXXX`.
4. `POST /api/v1/auth/login` -> Authenticates reviewer and establishes session cookie.
5. `POST /api/v1/cases/{id}/decision` -> Executes human fraud review and records immutable audit log.

