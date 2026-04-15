"""
CipherTrust — Health check route
"""
import hashlib
import json
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter
from app.core.config import settings
from app.core.database import AsyncSessionLocal, engine, Base
from app.core.security import hash_password
from app.models.user import (
    Organization, User, ConsentRecord, UserRole, ConsentType, ConsentStatus
)

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


@router.post("/seed")
async def seed_database():
    """One-time seed endpoint for production DB. Creates tables + demo data."""
    try:
        # Create tables
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        async with AsyncSessionLocal() as db:
            # Check if already seeded
            from sqlalchemy import select
            existing = (await db.execute(select(User).limit(1))).scalar_one_or_none()
            if existing:
                return {"status": "already_seeded"}

            org = Organization(
                name="Acme Corp Pvt Ltd",
                compliance_score=0.0,
                is_registered_onchain=False,
            )
            db.add(org)
            await db.flush()

            admin = User(
                email="admin@acmecorp.in",
                hashed_password=hash_password("password123"),
                full_name="Priya Sharma",
                role=UserRole.ORG_ADMIN,
                organization_id=org.id,
                is_active=True,
            )
            regulator = User(
                email="regulator@dpdpa.gov.in",
                hashed_password=hash_password("password123"),
                full_name="Raj Mehta (DPDPA Regulator)",
                role=UserRole.REGULATOR,
                is_active=True,
            )
            db.add(admin)
            db.add(regulator)
            await db.flush()

            consent_data = [
                {"user_id": "user_001@acmecorp.in", "consent_type": ConsentType.DATA_PROCESSING, "purpose": "Processing user data for core service delivery under DPDPA Section 7(a)", "days_ago": 30},
                {"user_id": "user_002@acmecorp.in", "consent_type": ConsentType.ANALYTICS, "purpose": "Aggregated usage analytics for product improvement", "days_ago": 25},
                {"user_id": "user_003@acmecorp.in", "consent_type": ConsentType.DATA_PROCESSING, "purpose": "Processing user data for core service delivery under DPDPA Section 7(a)", "days_ago": 20},
                {"user_id": "user_004@acmecorp.in", "consent_type": ConsentType.MARKETING, "purpose": "Sending promotional communications with explicit opt-in under DPDPA Section 7(b)", "days_ago": 15},
                {"user_id": "user_005@acmecorp.in", "consent_type": ConsentType.DATA_PROCESSING, "purpose": "Processing user data for core service delivery under DPDPA Section 7(a)", "days_ago": 10},
            ]

            for item in consent_data:
                now = datetime.now(timezone.utc)
                granted_at = now - timedelta(days=item["days_ago"])
                user_hash = hashlib.sha256(f"{org.id}:{item['user_id']}".encode()).hexdigest()
                consent_hash_payload = json.dumps({"org_id": org.id, "user_hash": user_hash, "type": item["consent_type"].value, "ts": granted_at.isoformat()}, sort_keys=True)
                consent_hash = hashlib.sha256(consent_hash_payload.encode()).hexdigest()

                db.add(ConsentRecord(
                    organization_id=org.id,
                    user_identifier_hash=user_hash,
                    consent_type=item["consent_type"],
                    status=ConsentStatus.ACTIVE,
                    purpose=item["purpose"],
                    granted_at=granted_at,
                    expires_at=granted_at + timedelta(days=365),
                    consent_hash=consent_hash,
                    is_anchored=False,
                ))

            await db.commit()
            return {"status": "seeded", "users": 2, "consents": 5}
    except Exception as e:
        return {"status": "error", "detail": str(e)}
