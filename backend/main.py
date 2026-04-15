"""
CipherTrust — FastAPI Backend Entry Point
"""

from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import auth, orgs, consent, proofs, compliance, health, analytics
from app.core.config import settings
from app.core.database import engine, Base
from app.core.middleware import RequestLoggingMiddleware
from app.core.redis import init_redis, close_redis
from app.core.exceptions import register_exception_handlers

log = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    log.info("Starting CipherTrust backend", network=settings.ALGORAND_NETWORK)
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        log.info("Database initialised")
    except Exception as exc:
        log.error("Database connection failed", error=str(exc))
        log.warning("App starting without database — set DATABASE_URL env var")
    await init_redis()
    log.info("Startup complete")
    yield
    # Shutdown
    await close_redis()
    await engine.dispose()
    log.info("Shutdown complete")


app = FastAPI(
    title="CipherTrust API",
    description="Privacy-Preserving RegTech Protocol — ZK Proof Compliance on Algorand",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

register_exception_handlers(app)

# ─── Middleware ────────────────────────────────────────────────────────────────
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(health.router, prefix="/api/v1", tags=["Health"])
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(orgs.router, prefix="/api/v1/orgs", tags=["Organizations"])
app.include_router(consent.router, prefix="/api/v1/consent", tags=["Consent"])
app.include_router(proofs.router, prefix="/api/v1/proofs", tags=["ZK Proofs"])
app.include_router(compliance.router, prefix="/api/v1/compliance", tags=["Compliance"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["Analytics"])


@app.get("/")
async def root():
    return {
        "service": "CipherTrust API",
        "version": "1.0.0",
        "network": settings.ALGORAND_NETWORK,
        "docs": "/docs",
    }
