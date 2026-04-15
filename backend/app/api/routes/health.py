"""
CipherTrust — Health check route
"""
import os
from fastapi import APIRouter
from app.core.config import settings

router = APIRouter()


@router.get("/health")
async def health():
    raw = os.environ.get("DATABASE_URL", "<NOT SET>")
    return {
        "status": "ok",
        "service": "CipherTrust API",
        "network": settings.ALGORAND_NETWORK,
        "db_env_set": raw != "<NOT SET>",
        "db_env_prefix": raw[:25] + "..." if len(raw) > 25 else raw,
        "db_async_prefix": settings.async_database_url[:35] + "..." if len(settings.async_database_url) > 35 else settings.async_database_url,
    }
