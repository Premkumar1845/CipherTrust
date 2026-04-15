"""
CipherTrust — Health check route
"""
from fastapi import APIRouter
from app.core.config import settings

router = APIRouter()


@router.get("/health")
async def health():
    db_url = settings.async_database_url
    return {
        "status": "ok",
        "service": "CipherTrust API",
        "network": settings.ALGORAND_NETWORK,
        "db_configured": "localhost" not in db_url and "127.0.0.1" not in db_url,
        "db_host": db_url.split("@")[-1].split("/")[0] if "@" in db_url else "unknown",
    }
