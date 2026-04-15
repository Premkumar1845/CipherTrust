"""
CipherTrust — Health check route
"""
import os
from fastapi import APIRouter
from app.core.config import settings

router = APIRouter()


@router.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "CipherTrust API",
        "network": settings.ALGORAND_NETWORK,
        "db_configured": not settings.DATABASE_URL.endswith("localhost:5432/ciphertrust"),
    }
