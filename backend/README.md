# Prohori backend

FastAPI + PostgreSQL (pgvector) service for Prohori. Layered architecture per
`docs/PROHORI_DOC02.md` Section 7: routers validate/authorize, services hold
business logic, repositories run SQL, and the `pipeline/` package is plain Python
(the only caller of Claude).

## Quick start

```bash
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt -r requirements-dev.txt  # Windows
# .venv/bin/pip install -r requirements.txt -r requirements-dev.txt             # macOS/Linux

# Required env vars (see ../.env.example): DATABASE_URL, ANTHROPIC_API_KEY,
# NUMBER_HMAC_KEY, SESSION_SECRET. The app refuses to start if any is missing.
uvicorn app.main:app --reload
```

Health probe: `GET /api/v1/health` (200 when the database is reachable, 503 when
not). OpenAPI docs at `/docs`.

## Checks

```bash
.venv/Scripts/python -m ruff check .
.venv/Scripts/python -m pytest
```

Tests run fully offline against in-memory SQLite — no Postgres required.
