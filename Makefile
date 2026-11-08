# Prohori developer tasks.
#
# Requires: Docker (for `dev`/`migrate` against Postgres), Python 3.12 with a
# backend virtualenv at backend/.venv, and Node 20+ with frontend deps installed.
#
# Common targets:
#   make dev       Start Postgres + backend (compose) and the Vite frontend.
#   make test      Run backend (pytest) and frontend (vitest) test suites.
#   make lint      Run ruff (backend) and eslint + tsc (frontend).
#   make migrate   Apply Alembic migrations to the database.
#   make seed      Load simulated seed data (Phase 03).
#   make eval      Run the evaluation harness (Phase 12).

# Prefer the backend virtualenv interpreter; fall back to python on PATH.
PY := $(shell [ -x backend/.venv/bin/python ] && echo backend/.venv/bin/python \
	|| ([ -x backend/.venv/Scripts/python.exe ] && echo backend/.venv/Scripts/python.exe \
	|| echo python))

.PHONY: help dev dev-backend dev-frontend install test test-backend test-frontend \
	lint lint-backend lint-frontend audit audit-backend audit-frontend \
	migrate seed eval nightly

help:
	@grep -E '^[a-zA-Z_-]+:.*?##' $(MAKEFILE_LIST) | \
	awk 'BEGIN {FS = ":.*?## "}; {printf "  %-16s %s\n", $$1, $$2}'

install: ## Install backend and frontend dependencies
	cd backend && python -m venv .venv && \
		.venv/bin/pip install -r requirements.txt -r requirements-dev.txt
	cd frontend && npm install

dev: ## Start Postgres + backend (compose) and the Vite frontend
	docker compose up --build -d db backend
	cd frontend && npm run dev

dev-backend: ## Start only Postgres + backend via docker compose
	docker compose up --build db backend

dev-frontend: ## Start only the Vite dev server
	cd frontend && npm run dev

test: test-backend test-frontend ## Run all tests

test-backend: ## Run backend pytest suite
	cd backend && $(PY) -m pytest

test-frontend: ## Run frontend vitest suite
	cd frontend && npm test

lint: lint-backend lint-frontend ## Run all linters and type checks

lint-backend: ## Run ruff on the backend
	cd backend && $(PY) -m ruff check .

lint-frontend: ## Run eslint and the TypeScript type check
	cd frontend && npm run lint && npm run typecheck

audit: audit-backend audit-frontend ## Run security audits (pip-audit, npm audit)

audit-backend: ## Run pip-audit on backend dependencies
	cd backend && $(PY) -m pip_audit --desc on -r requirements.txt

audit-frontend: ## Run npm audit on frontend dependencies
	cd frontend && npm audit

migrate: ## Apply Alembic migrations (needs a running database)
	cd backend && $(PY) -m alembic upgrade head

seed: ## Load simulated seed data
	cd backend && $(PY) scripts/seed.py

eval: ## Run the evaluation harness
	cd backend && $(PY) evals/run_eval.py

nightly: ## Run the nightly batch job (F26)
	cd backend && $(PY) -m app.jobs.nightly
