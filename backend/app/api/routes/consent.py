"""
CipherTrust — Consent Routes
"""
import asyncio
import hashlib
import json
from datetime import datetime, timezone

import structlog
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.blockchain.algorand_client import algorand
from app.core.database import get_db, AsyncSessionLocal
from app.models.user import ConsentRecord, Organization
from app.schemas.schemas import ConsentCreateRequest, ConsentResponse

log = structlog.get_logger()
router = APIRouter()


def _hash_consent(org_id: int, user_hash: str, consent_type: str, granted_at: datetime) -> str:
    payload = json.dumps({
        "org_id": org_id,
        "user_hash": user_hash,
        "type": consent_type,
        "ts": granted_at.isoformat(),
    }, sort_keys=True)
    return hashlib.sha256(payload.encode()).hexdigest()


@router.post("/{org_id}/records", response_model=ConsentResponse, status_code=201)
async def create_consent(
    org_id: int,
    payload: ConsentCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Organization).where(Organization.id == org_id))
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Hash the user identifier — PII never stored in plaintext
    user_hash = hashlib.sha256(f"{org_id}:{payload.user_identifier}".encode()).hexdigest()
    granted_at = datetime.now(timezone.utc)

    consent = ConsentRecord(
        organization_id=org_id,
        user_identifier_hash=user_hash,
        consent_type=payload.consent_type,
        purpose=payload.purpose,
        granted_at=granted_at,
        expires_at=payload.expires_at,
    )
    db.add(consent)
    await db.flush()

    # Compute consent hash
    consent.consent_hash = _hash_consent(org_id, user_hash, payload.consent_type, granted_at)

    await db.flush()
    await db.refresh(consent)
    consent_id = consent.id
    consent_hash = consent.consent_hash
    consent_type = payload.consent_type

    # Fire-and-forget blockchain anchor (4s+ Algorand round-trip runs in background)
    async def _anchor_in_background():
        try:
            txn_id = algorand.anchor_consent_with_payment(
                consent_hash=consent_hash,
                org_id=org_id,
                consent_type=consent_type,
            )
            async with AsyncSessionLocal() as sess:
                result = await sess.execute(
                    select(ConsentRecord).where(ConsentRecord.id == consent_id)
                )
                rec = result.scalar_one_or_none()
                if rec:
                    rec.txn_id = txn_id
                    rec.is_anchored = True
                    await sess.commit()
            log.info("consent_anchored", consent_id=consent_id, txn_id=txn_id)
        except Exception as e:
            log.warning("consent_anchor_failed", consent_id=consent_id, error=str(e))

    asyncio.create_task(_anchor_in_background())

    return consent


@router.get("/{org_id}/records", response_model=list[ConsentResponse])
async def list_consents(org_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ConsentRecord).where(ConsentRecord.organization_id == org_id)
    )
    return result.scalars().all()


@router.post("/{org_id}/records/{consent_id}/anchor", response_model=ConsentResponse)
async def anchor_consent(
    org_id: int,
    consent_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Anchor a consent hash on the Algorand Consent Registry contract."""
    result = await db.execute(
        select(ConsentRecord).where(
            ConsentRecord.id == consent_id,
            ConsentRecord.organization_id == org_id,
        )
    )
    consent = result.scalar_one_or_none()
    if not consent:
        raise HTTPException(status_code=404, detail="Consent record not found")
    if consent.is_anchored:
        raise HTTPException(status_code=400, detail="Consent already anchored on-chain")
    if not consent.consent_hash:
        raise HTTPException(status_code=400, detail="Consent hash not computed")

    try:
        txn_id = algorand.log_consent(consent.consent_hash, org_id, consent.consent_type)
        consent.txn_id = txn_id
        consent.is_anchored = True
        await db.flush()
        await db.refresh(consent)
        return consent
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Anchoring failed: {str(e)}")


@router.delete("/{org_id}/records/{consent_id}", response_model=ConsentResponse)
async def revoke_consent(
    org_id: int,
    consent_id: int,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ConsentRecord).where(
            ConsentRecord.id == consent_id,
            ConsentRecord.organization_id == org_id,
        )
    )
    consent = result.scalar_one_or_none()
    if not consent:
        raise HTTPException(status_code=404, detail="Consent record not found")

    consent.status = "revoked"
    consent.revoked_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(consent)
    return consent
