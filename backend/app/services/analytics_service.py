"""
CipherTrust — Compliance Analytics Service

Calculates:
  - Dynamic compliance score (0–100)
  - Consent coverage rate
  - Proof freshness (days since last verified proof)
  - Risk flags
  - 30-day activity trend
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import (
    ComplianceCertificate, ConsentRecord,
    Organization, ZKProof,
)


class ComplianceAnalyticsService:

    # ── Score weights ──────────────────────────────────────────────────────────
    WEIGHT_ACTIVE_CONSENTS  = 25   # up to 25 pts for having active consents
    WEIGHT_ANCHORED         = 20   # up to 20 pts for on-chain anchoring
    WEIGHT_VERIFIED_PROOFS  = 30   # up to 30 pts for verified ZK proofs
    WEIGHT_CERTIFICATE      = 15   # up to 15 pts for active certificate
    WEIGHT_FRESHNESS        = 10   # up to 10 pts for proof recency

    async def calculate_score(self, org_id: int, db: AsyncSession) -> float:
        """Compute a 0–100 compliance score for an organisation."""
        score = 0.0

        # 1. Active consents (up to 25 pts — 5 pts each, max 5 consents)
        active = await db.scalar(
            select(func.count()).where(
                ConsentRecord.organization_id == org_id,
                ConsentRecord.status == "active",
            )
        ) or 0
        score += min(active, 5) * 5.0

        # 2. On-chain anchored consents (up to 20 pts)
        anchored = await db.scalar(
            select(func.count()).where(
                ConsentRecord.organization_id == org_id,
                ConsentRecord.is_anchored == True,
            )
        ) or 0
        if active > 0:
            score += (anchored / active) * self.WEIGHT_ANCHORED

        # 3. Verified ZK proofs (up to 30 pts — 10 pts each, max 3)
        verified = await db.scalar(
            select(func.count()).where(
                ZKProof.organization_id == org_id,
                ZKProof.status == "verified",
            )
        ) or 0
        score += min(verified, 3) * 10.0

        # 4. Active compliance certificate (15 pts)
        now = datetime.now(timezone.utc)
        cert = await db.scalar(
            select(func.count()).where(
                ComplianceCertificate.organization_id == org_id,
                ComplianceCertificate.status == "compliant",
                ComplianceCertificate.expires_at > now,
            )
        ) or 0
        if cert > 0:
            score += self.WEIGHT_CERTIFICATE

        # 5. Proof freshness (up to 10 pts — full points if proof within 30 days)
        latest_proof = await db.scalar(
            select(func.max(ZKProof.verified_at)).where(
                ZKProof.organization_id == org_id,
                ZKProof.status == "verified",
            )
        )
        if latest_proof:
            days_since = (now - latest_proof).days
            freshness_score = max(0, 1 - (days_since / 90)) * self.WEIGHT_FRESHNESS
            score += freshness_score

        return round(min(score, 100.0), 1)

    async def get_risk_flags(self, org_id: int, db: AsyncSession) -> List[Dict[str, str]]:
        """Return a list of active compliance risk flags."""
        flags = []
        now = datetime.now(timezone.utc)

        # Expired consents that haven't been renewed
        expired_count = await db.scalar(
            select(func.count()).where(
                ConsentRecord.organization_id == org_id,
                ConsentRecord.expires_at < now,
                ConsentRecord.status == "active",
            )
        ) or 0
        if expired_count > 0:
            flags.append({
                "level": "high",
                "code": "EXPIRED_CONSENTS",
                "message": f"{expired_count} consent record(s) have expired and need renewal.",
            })

        # No verified proofs at all
        verified = await db.scalar(
            select(func.count()).where(
                ZKProof.organization_id == org_id,
                ZKProof.status == "verified",
            )
        ) or 0
        if verified == 0:
            flags.append({
                "level": "high",
                "code": "NO_VERIFIED_PROOFS",
                "message": "No verified ZK proofs found. Submit a compliance proof to proceed.",
            })

        # Stale proof (last verified > 90 days ago)
        latest_proof_date = await db.scalar(
            select(func.max(ZKProof.verified_at)).where(
                ZKProof.organization_id == org_id,
                ZKProof.status == "verified",
            )
        )
        if latest_proof_date and (now - latest_proof_date).days > 90:
            flags.append({
                "level": "medium",
                "code": "STALE_PROOF",
                "message": "Last verified proof is over 90 days old. Consider re-submitting.",
            })

        # Unanchored consents
        unanchored = await db.scalar(
            select(func.count()).where(
                ConsentRecord.organization_id == org_id,
                ConsentRecord.status == "active",
                ConsentRecord.is_anchored == False,
            )
        ) or 0
        if unanchored > 0:
            flags.append({
                "level": "low",
                "code": "UNANCHORED_CONSENTS",
                "message": f"{unanchored} consent(s) not yet anchored on Algorand.",
            })

        # No active certificate
        active_cert = await db.scalar(
            select(func.count()).where(
                ComplianceCertificate.organization_id == org_id,
                ComplianceCertificate.status == "compliant",
                ComplianceCertificate.expires_at > now,
            )
        ) or 0
        if active_cert == 0 and verified > 0:
            flags.append({
                "level": "medium",
                "code": "NO_CERTIFICATE",
                "message": "Verified proofs exist but no certificate has been issued.",
            })

        return flags

    async def get_activity_trend(
        self, org_id: int, db: AsyncSession, days: int = 30
    ) -> List[Dict[str, Any]]:
        """Return daily activity counts for the last N days."""
        now = datetime.now(timezone.utc)
        trend = []

        for i in range(days - 1, -1, -1):
            day_start = (now - timedelta(days=i)).replace(
                hour=0, minute=0, second=0, microsecond=0
            )
            day_end = day_start + timedelta(days=1)

            consents_that_day = await db.scalar(
                select(func.count()).where(
                    ConsentRecord.organization_id == org_id,
                    ConsentRecord.created_at >= day_start,
                    ConsentRecord.created_at < day_end,
                )
            ) or 0

            proofs_that_day = await db.scalar(
                select(func.count()).where(
                    ZKProof.organization_id == org_id,
                    ZKProof.created_at >= day_start,
                    ZKProof.created_at < day_end,
                )
            ) or 0

            trend.append({
                "date": day_start.strftime("%Y-%m-%d"),
                "consents": consents_that_day,
                "proofs": proofs_that_day,
            })

        return trend


analytics_service = ComplianceAnalyticsService()
