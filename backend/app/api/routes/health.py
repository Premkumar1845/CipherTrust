"""
CipherTrust — Health check route
"""
from fastapi import APIRouter
from app.core.config import settings

router = APIRouter()


@router.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "CipherTrust API",
        "network": settings.ALGORAND_NETWORK,
    }
