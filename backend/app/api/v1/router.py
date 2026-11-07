"""Aggregate router for API v1.

As features land (auth, checks, cases, analytics …) their routers are included
here. For the Phase 01 skeleton only the health probe is mounted.
"""

from __future__ import annotations

from fastapi import APIRouter

from app.api.v1 import auth, health, me

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(me.router)
