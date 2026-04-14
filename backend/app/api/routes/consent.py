"""
CipherTrust — Consent Routes
"""
import hashlib
import json
from datetime import datetime, timezone

import structlog
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.blockchain.algorand_client import algorand
from app.core.database import get_db
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


# ─── Build unsigned transaction for Pera Wallet signing ───────────────────────

@router.post("/{org_id}/records/{consent_id}/build-anchor-txn")
async def build_anchor_txn(
    org_id: int,
    consent_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Return the unsigned payment transaction bytes (base64) so the
    frontend can have the user sign via Pera Wallet before broadcasting.
    """
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
        import base64
        params = algorand.get_params()
        note = json.dumps({
            "app": "ciphertrust-consent",
            "hash": consent.consent_hash,
            "org_id": org_id,
            "type": consent.consent_type,
        }).encode()

        return {
            "note": base64.b64encode(note).decode(),
            "receiver": "PWW7ASSQVVHMMVLB4ZTCT47XAWQWSF6KU74TVEXKC3J37LC2NWNNSPFK3I",
            "amount": 1_000_000,
            "consent_hash": consent.consent_hash,
            "first_round": params.first,
            "last_round": params.last,
            "genesis_hash": params.gh,
            "genesis_id": params.gen,
            "fee": params.min_fee,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to build transaction: {str(e)}")


# ─── Record signed transaction after Pera Wallet approval ─────────────────────

class ConfirmAnchorRequest(BaseModel):
    txn_id: str


@router.post("/{org_id}/records/{consent_id}/confirm-anchor", response_model=ConsentResponse)
async def confirm_anchor(
    org_id: int,
    consent_id: int,
    payload: ConfirmAnchorRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Called by the frontend after the user signs and submits the transaction
    via Pera Wallet. Records the txn_id and marks the consent as anchored.
    """
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

    consent.txn_id = payload.txn_id
    consent.is_anchored = True
    await db.flush()
    await db.refresh(consent)
    log.info("consent_anchored_via_wallet", consent_id=consent_id, txn_id=payload.txn_id)
    return consent


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
