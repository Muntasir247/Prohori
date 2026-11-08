"""Aggregate router for API v1.

As features land (auth, checks, cases, analytics …) their routers are included
here.
"""

from __future__ import annotations

from fastapi import APIRouter

from app.api.v1 import analytics, auth, campaigns, cases, checks, health, me, public

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(me.router)
api_router.include_router(checks.router)
api_router.include_router(public.router)
api_router.include_router(analytics.router)
api_router.include_router(campaigns.router)
api_router.include_router(cases.router)
