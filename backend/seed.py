#!/usr/bin/env python3
"""
CipherTrust — Database Seed Script

Seeds demo data so the app is immediately usable after setup.
Run: python backend/seed.py

Creates:
  - 1 org admin user      (admin@acmecorp.in / password123)
  - 1 regulator user      (regulator@dpdpa.gov.in / password123)
  - 1 organisation        (Acme Corp Pvt Ltd)
  - 5 consent records     (mix of types)
"""

import asyncio
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app.core.config import settings
from app.core.database import AsyncSessionLocal, Base, engine
from app.core.security import hash_password
from app.models.user import (
    Organization, User, ConsentRecord, UserRole, ConsentType, ConsentStatus
)
import hashlib
import json


async def seed():
    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # ── Organisation ──────────────────────────────────────────────────────
        org = Organization(
            name="Acme Corp Pvt Ltd",
            compliance_score=0.0,
            is_registered_onchain=False,
        )
        db.add(org)
        await db.flush()

        print(f"✅  Created organisation: {org.name} (id={org.id})")

        # ── Users ─────────────────────────────────────────────────────────────
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

        print(f"✅  Created users:")
        print(f"    Org admin  : admin@acmecorp.in      / password123")
        print(f"    Regulator  : regulator@dpdpa.gov.in / password123")

        # ── Consent records ───────────────────────────────────────────────────
        consent_data = [
            {
                "user_id": "user_001@acmecorp.in",
                "consent_type": ConsentType.DATA_PROCESSING,
                "purpose": "Processing user data for core service delivery under DPDPA Section 7(a)",
                "days_ago": 30,
            },
            {
                "user_id": "user_002@acmecorp.in",
                "consent_type": ConsentType.ANALYTICS,
                "purpose": "Aggregated usage analytics for product improvement — no individual profiling",
                "days_ago": 25,
            },
            {
                "user_id": "user_003@acmecorp.in",
                "consent_type": ConsentType.DATA_PROCESSING,
                "purpose": "Processing user data for core service delivery under DPDPA Section 7(a)",
                "days_ago": 20,
            },
            {
                "user_id": "user_004@acmecorp.in",
                "consent_type": ConsentType.MARKETING,
                "purpose": "Sending promotional communications with explicit opt-in under DPDPA Section 7(b)",
                "days_ago": 15,
            },
            {
                "user_id": "user_005@acmecorp.in",
                "consent_type": ConsentType.DATA_PROCESSING,
                "purpose": "Processing user data for core service delivery under DPDPA Section 7(a)",
                "days_ago": 10,
            },
        ]

        for item in consent_data:
            now = datetime.now(timezone.utc)
            granted_at = now - timedelta(days=item["days_ago"])

            user_hash = hashlib.sha256(
                f"{org.id}:{item['user_id']}".encode()
            ).hexdigest()

            consent_hash_payload = json.dumps({
                "org_id": org.id,
                "user_hash": user_hash,
                "type": item["consent_type"].value,
                "ts": granted_at.isoformat(),
            }, sort_keys=True)
            consent_hash = hashlib.sha256(consent_hash_payload.encode()).hexdigest()

            consent = ConsentRecord(
                organization_id=org.id,
                user_identifier_hash=user_hash,
                consent_type=item["consent_type"],
                status=ConsentStatus.ACTIVE,
                purpose=item["purpose"],
                granted_at=granted_at,
                expires_at=granted_at + timedelta(days=365),
                consent_hash=consent_hash,
                is_anchored=False,
            )
            db.add(consent)

        await db.flush()
        await db.commit()

        print(f"✅  Created {len(consent_data)} consent records")
        print(f"\n🎉  Seed complete. Start the app and visit http://localhost:3000")
        print(f"    Log in as admin@acmecorp.in (password: password123)")


if __name__ == "__main__":
    asyncio.run(seed())
    