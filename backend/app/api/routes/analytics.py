"""
CipherTrust — Analytics Routes
"""
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.analytics_service import analytics_service

router = APIRouter()


@router.get("/{org_id}/score")
async def get_score(org_id: int, db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """Compute the current compliance score for an organisation."""
    score = await analytics_service.calculate_score(org_id, db)
    return {
        "org_id": org_id,
        "score": score,
        "grade": _grade(score),
    }


@router.get("/{org_id}/risk-flags")
async def get_risk_flags(org_id: int, db: AsyncSession = Depends(get_db)) -> List[Dict[str, str]]:
    """Return active compliance risk flags for an organisation."""
    return await analytics_service.get_risk_flags(org_id, db)


@router.get("/{org_id}/trend")
async def get_trend(
    org_id: int,
    days: int = 30,
    db: AsyncSession = Depends(get_db),
) -> List[Dict[str, Any]]:
    """Return daily consent + proof activity for the last N days (max 90)."""
    if days > 90:
        raise HTTPException(status_code=400, detail="Maximum trend window is 90 days")
    return await analytics_service.get_activity_trend(org_id, db, days)


@router.get("/{org_id}/dashboard")
async def get_dashboard(org_id: int, db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """Combined analytics snapshot — score + flags + 30-day trend (cached)."""
    return await analytics_service.get_dashboard(org_id, db)


def _grade(score: float) -> str:
    if score >= 90: return "A"
    if score >= 75: return "B"
    if score >= 60: return "C"
    if score >= 40: return "D"
    return "F"
