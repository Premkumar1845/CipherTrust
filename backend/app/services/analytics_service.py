"""
CipherTrust — Compliance Analytics Service

Calculates:
  - Dynamic compliance score (0–100)
  - Consent coverage rate
  - Proof freshness (days since last verified proof)
  - Risk flags
  - 30-day activity trend
"""

import json
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import case, cast, Date, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import (
    ComplianceCertificate, ConsentRecord,
    Organization, ZKProof,
)
from app.core.redis import get_redis

CACHE_TTL = 45  # seconds


class ComplianceAnalyticsService:

    # ── Score weights ──────────────────────────────────────────────────────────
    WEIGHT_ACTIVE_CONSENTS  = 25
    WEIGHT_ANCHORED         = 20
    WEIGHT_VERIFIED_PROOFS  = 30
    WEIGHT_CERTIFICATE      = 15
    WEIGHT_FRESHNESS        = 10

    # ── Internal: fetch all counts in ONE query ──────────────────────────────
    async def _fetch_score_data(self, org_id: int, db: AsyncSession, now: datetime) -> dict:
        """Single query to get all counts needed for score + risk flags."""
        row = (await db.execute(
            select(
                # total consents
                func.count().label("total_consents"),
                # active consents
                func.count().filter(
                    ConsentRecord.status == "active",
                ).label("active_consents"),
                # anchored consents
                func.count().filter(
                    ConsentRecord.is_anchored == True,
                ).label("anchored_consents"),
                # expired (still marked active but past expiry)
                func.count().filter(
                    ConsentRecord.status == "active",
                    ConsentRecord.expires_at < now,
                ).label("expired_consents"),
                # unanchored active
                func.count().filter(
                    ConsentRecord.status == "active",
                    ConsentRecord.is_anchored == False,
                ).label("unanchored_consents"),
                # revoked
                func.count().filter(
                    ConsentRecord.status == "revoked",
                ).label("revoked_consents"),
            ).select_from(ConsentRecord).where(
                ConsentRecord.organization_id == org_id,
            )
        )).one()

        proof_row = (await db.execute(
            select(
                func.count().label("total_proofs"),
                func.count().filter(
                    ZKProof.status == "verified",
                ).label("verified_proofs"),
                func.count().filter(
                    ZKProof.status == "generated",
                ).label("generated_proofs"),
                func.max(
                    case(
                        (ZKProof.status == "verified", ZKProof.verified_at),
                    )
                ).label("latest_proof_date"),
            ).select_from(ZKProof).where(
                ZKProof.organization_id == org_id,
            )
        )).one()

        cert_row = (await db.execute(
            select(
                func.count().label("total_certs"),
                func.count().filter(
                    ComplianceCertificate.status == "compliant",
                    ComplianceCertificate.expires_at > now,
                ).label("active_certs"),
            ).select_from(ComplianceCertificate).where(
                ComplianceCertificate.organization_id == org_id,
            )
        )).one()

        return {
            "total": row.total_consents or 0,
            "active": row.active_consents or 0,
            "anchored": row.anchored_consents or 0,
            "expired": row.expired_consents or 0,
            "unanchored": row.unanchored_consents or 0,
            "revoked": row.revoked_consents or 0,
            "total_proofs": proof_row.total_proofs or 0,
            "verified": proof_row.verified_proofs or 0,
            "generated_proofs": proof_row.generated_proofs or 0,
            "latest_proof_date": proof_row.latest_proof_date,
            "total_certs": cert_row.total_certs or 0,
            "active_cert": cert_row.active_certs or 0,
        }

    async def calculate_score(self, org_id: int, db: AsyncSession, data: Optional[dict] = None) -> float:
        """Compute a 0–100 compliance score for an organisation."""
        now = datetime.now(timezone.utc)
        if data is None:
            data = await self._fetch_score_data(org_id, db, now)

        score = 0.0
        active = data["active"]
        score += min(active, 5) * 5.0

        if active > 0:
            score += (data["anchored"] / active) * self.WEIGHT_ANCHORED

        score += min(data["verified"], 3) * 10.0

        if data["active_cert"] > 0:
            score += self.WEIGHT_CERTIFICATE

        latest_proof = data["latest_proof_date"]
        if latest_proof:
            days_since = (now - latest_proof).days
            score += max(0, 1 - (days_since / 90)) * self.WEIGHT_FRESHNESS

        return round(min(score, 100.0), 1)

    async def get_risk_flags(self, org_id: int, db: AsyncSession, data: Optional[dict] = None) -> List[Dict[str, str]]:
        """Return a list of active compliance risk flags."""
        now = datetime.now(timezone.utc)
        if data is None:
            data = await self._fetch_score_data(org_id, db, now)

        flags: List[Dict[str, str]] = []

        if data["expired"] > 0:
            flags.append({
                "level": "high",
                "code": "EXPIRED_CONSENTS",
                "message": f"{data['expired']} consent record(s) have expired and need renewal.",
            })

        if data["verified"] == 0:
            flags.append({
                "level": "high",
                "code": "NO_VERIFIED_PROOFS",
                "message": "No verified ZK proofs found. Submit a compliance proof to proceed.",
            })

        if data["latest_proof_date"] and (now - data["latest_proof_date"]).days > 90:
            flags.append({
                "level": "medium",
                "code": "STALE_PROOF",
                "message": "Last verified proof is over 90 days old. Consider re-submitting.",
            })

        if data["unanchored"] > 0:
            flags.append({
                "level": "low",
                "code": "UNANCHORED_CONSENTS",
                "message": f"{data['unanchored']} consent(s) not yet anchored on Algorand.",
            })

        if data["active_cert"] == 0 and data["verified"] > 0:
            flags.append({
                "level": "medium",
                "code": "NO_CERTIFICATE",
                "message": "Verified proofs exist but no certificate has been issued.",
            })

        return flags

    async def get_activity_trend(
        self, org_id: int, db: AsyncSession, days: int = 30
    ) -> List[Dict[str, Any]]:
        """Return daily activity counts for the last N days (2 queries instead of 60)."""
        now = datetime.now(timezone.utc)
        start = (now - timedelta(days=days - 1)).replace(hour=0, minute=0, second=0, microsecond=0)

        # Single query per table, grouped by day
        consent_rows = (await db.execute(
            select(
                cast(ConsentRecord.created_at, Date).label("day"),
                func.count().label("cnt"),
            )
            .where(
                ConsentRecord.organization_id == org_id,
                ConsentRecord.created_at >= start,
            )
            .group_by(cast(ConsentRecord.created_at, Date))
        )).all()

        proof_rows = (await db.execute(
            select(
                cast(ZKProof.created_at, Date).label("day"),
                func.count().label("cnt"),
            )
            .where(
                ZKProof.organization_id == org_id,
                ZKProof.created_at >= start,
            )
            .group_by(cast(ZKProof.created_at, Date))
        )).all()

        consent_map = {row.day: row.cnt for row in consent_rows}
        proof_map = {row.day: row.cnt for row in proof_rows}

        trend = []
        for i in range(days - 1, -1, -1):
            d = (now - timedelta(days=i)).date()
            trend.append({
                "date": d.isoformat(),
                "consents": consent_map.get(d, 0),
                "proofs": proof_map.get(d, 0),
            })
        return trend

    # ── Cached dashboard endpoint ────────────────────────────────────────────
    async def get_dashboard(self, org_id: int, db: AsyncSession) -> Dict[str, Any]:
        """Score + flags + trend with Redis cache."""
        cache_key = f"analytics:dashboard:{org_id}"
        r = None
        try:
            r = get_redis()
            if r:
                cached = await r.get(cache_key)
                if cached:
                    return json.loads(cached)
        except Exception:
            pass  # Redis down — fall through

        now = datetime.now(timezone.utc)
        data = await self._fetch_score_data(org_id, db, now)
        score = await self.calculate_score(org_id, db, data)
        flags = await self.get_risk_flags(org_id, db, data)
        trend = await self.get_activity_trend(org_id, db, 30)

        result = {
            "org_id": org_id,
            "score": score,
            "grade": _grade(score),
            "risk_flags": flags,
            "trend": trend,
            "counts": {
                "total_consents": data["total"],
                "active_consents": data["active"],
                "anchored_consents": data["anchored"],
                "revoked_consents": data["revoked"],
                "total_proofs": data["total_proofs"],
                "verified_proofs": data["verified"],
                "generated_proofs": data["generated_proofs"],
                "total_certificates": data["total_certs"],
                "active_certificates": data["active_cert"],
            },
        }

        try:
            if r:
                await r.setex(cache_key, CACHE_TTL, json.dumps(result, default=str))
        except Exception:
            pass

        return result


def _grade(score: float) -> str:
    if score >= 90: return "A"
    if score >= 75: return "B"
    if score >= 60: return "C"
    if score >= 40: return "D"
    return "F"


analytics_service = ComplianceAnalyticsService()
