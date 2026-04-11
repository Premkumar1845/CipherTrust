"""
CipherTrust — Global Exception Handlers

Produces consistent JSON error envelopes for all unhandled exceptions.

Response shape:
  { "error": "...", "detail": "...", "request_id": "..." }
"""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError, OperationalError
import structlog

log = structlog.get_logger()


def register_exception_handlers(app: FastAPI) -> None:

    @app.exception_handler(IntegrityError)
    async def integrity_error_handler(request: Request, exc: IntegrityError):
        rid = getattr(request.state, "request_id", "—")
        log.warning("db_integrity_error", request_id=rid, detail=str(exc.orig))
        return JSONResponse(
            status_code=409,
            content={
                "error": "Conflict",
                "detail": "A record with the same unique identifier already exists.",
                "request_id": rid,
            },
        )

    @app.exception_handler(OperationalError)
    async def operational_error_handler(request: Request, exc: OperationalError):
        rid = getattr(request.state, "request_id", "—")
        log.error("db_operational_error", request_id=rid, detail=str(exc))
        return JSONResponse(
            status_code=503,
            content={
                "error": "Service Unavailable",
                "detail": "Database is temporarily unavailable. Please retry.",
                "request_id": rid,
            },
        )

    @app.exception_handler(ValueError)
    async def value_error_handler(request: Request, exc: ValueError):
        rid = getattr(request.state, "request_id", "—")
        return JSONResponse(
            status_code=422,
            content={
                "error": "Validation Error",
                "detail": str(exc),
                "request_id": rid,
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        rid = getattr(request.state, "request_id", "—")
        log.error(
            "unhandled_exception",
            request_id=rid,
            path=request.url.path,
            error=type(exc).__name__,
            detail=str(exc),
        )
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal Server Error",
                "detail": "An unexpected error occurred.",
                "request_id": rid,
            },
        )
