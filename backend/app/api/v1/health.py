"""Health probe.

``GET /api/v1/health`` reports whether the process is up and whether the database
answers. It returns 200 when the database is reachable and 503 when it is not, so
load balancers and the frontend home screen can both read a single signal.
"""

from __future__ import annotations

from fastapi import APIRouter, Response
from pydantic import BaseModel

from app import __version__
from app.db import ping

router = APIRouter(tags=["system"])


class HealthResponse(BaseModel):
    status: str  # "ok" | "degraded"
    database: str  # "up" | "down"
    version: str


@router.get("/health", response_model=HealthResponse)
async def health(response: Response) -> HealthResponse:
    try:
        db_up = await ping()
    except Exception:
        db_up = False

    if not db_up:
        response.status_code = 503
        return HealthResponse(status="degraded", database="down", version=__version__)
    return HealthResponse(status="ok", database="up", version=__version__)
