"""FastAPI application factory.

Wires middleware in the order required by Doc 02 Section 7 (request id, security
headers, CORS, then the route), installs the global exception handlers that emit
the standard error envelope, and mounts the v1 router.
"""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app import __version__
from app.api.v1.router import api_router
from app.config import get_settings
from app.errors import AppError, envelope_from_parts
from app.logging_config import configure_logging, get_logger
from app.middleware.request_id import RequestContextMiddleware
from app.middleware.security_headers import SecurityHeadersMiddleware

_logger = get_logger("prohori")

# Map a handful of HTTP status codes to stable envelope codes.
_STATUS_CODE_NAMES = {
    400: "bad_request",
    401: "unauthorized",
    403: "forbidden",
    404: "not_found",
    405: "method_not_allowed",
    409: "conflict",
    422: "validation_error",
    429: "rate_limited",
}


def _request_id(request: Request) -> str:
    return getattr(request.state, "request_id", "unknown")


@asynccontextmanager
async def _lifespan(app: FastAPI):
    settings = get_settings()
    configure_logging(settings.log_level)
    _logger.info("startup", extra={"route": "lifespan"})
    yield
    # Import here so app construction never needs a live DB driver.
    from app.db import dispose_engine

    await dispose_engine()
    _logger.info("shutdown", extra={"route": "lifespan"})


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(settings.log_level)

    app = FastAPI(
        title="Prohori API",
        version=__version__,
        docs_url="/docs",
        openapi_url="/openapi.json",
        lifespan=_lifespan,
    )

    # Middleware is applied bottom-up, so register in reverse of execution order:
    # execution order ends up request id -> security headers -> CORS -> route.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "X-Requested-With"],
    )
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(RequestContextMiddleware)

    _register_error_handlers(app)
    app.include_router(api_router)
    return app


def _register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def _handle_app_error(request: Request, exc: AppError) -> JSONResponse:
        rid = _request_id(request)
        headers = {}
        if exc.retry_after is not None:
            headers["Retry-After"] = str(exc.retry_after)
        return JSONResponse(
            status_code=exc.status,
            content=exc.envelope(rid),
            headers=headers,
        )

    @app.exception_handler(RequestValidationError)
    async def _handle_validation(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        fields: dict[str, str] = {}
        for err in exc.errors():
            loc = ".".join(str(p) for p in err.get("loc", []) if p != "body")
            if loc:
                fields[loc] = err.get("type", "invalid")
        return JSONResponse(
            status_code=422,
            content=envelope_from_parts(
                code="validation_error",
                request_id=_request_id(request),
                fields=fields,
            ),
        )

    @app.exception_handler(StarletteHTTPException)
    async def _handle_http(
        request: Request, exc: StarletteHTTPException
    ) -> JSONResponse:
        code = _STATUS_CODE_NAMES.get(exc.status_code, "error")
        return JSONResponse(
            status_code=exc.status_code,
            content=envelope_from_parts(
                code=code, request_id=_request_id(request)
            ),
        )

    @app.exception_handler(Exception)
    async def _handle_unexpected(
        request: Request, exc: Exception
    ) -> JSONResponse:
        rid = _request_id(request)
        # Log the stack, but never the request body — it may hold message text.
        _logger.exception("unhandled_error", extra={"request_id": rid})
        return JSONResponse(
            status_code=500,
            content=envelope_from_parts(code="internal_error", request_id=rid),
        )


app = create_app()
