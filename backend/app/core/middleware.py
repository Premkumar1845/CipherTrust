"""
CipherTrust — Middleware
  - Request ID injection
  - Structured request/response logging
  - Response time header
"""

import time
import uuid
from typing import Callable

import structlog
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

log = structlog.get_logger()


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Attaches a unique request ID to every request,
    logs method/path/status/duration, and injects
    X-Request-ID + X-Response-Time headers.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request_id = str(uuid.uuid4())[:8]
        start = time.perf_counter()

        # Attach to request state so route handlers can access it
        request.state.request_id = request_id

        bound_log = log.bind(
            request_id=request_id,
            method=request.method,
            path=request.url.path,
        )

        try:
            response = await call_next(request)
        except Exception as exc:
            duration_ms = round((time.perf_counter() - start) * 1000, 2)
            bound_log.error("request_error", error=str(exc), duration_ms=duration_ms)
            raise

        duration_ms = round((time.perf_counter() - start) * 1000, 2)

        # Skip logging for health checks to reduce noise
        if request.url.path not in ("/api/v1/health", "/"):
            bound_log.info(
                "request",
                status=response.status_code,
                duration_ms=duration_ms,
            )

        response.headers["X-Request-ID"] = request_id
        response.headers["X-Response-Time"] = f"{duration_ms}ms"
        return response
