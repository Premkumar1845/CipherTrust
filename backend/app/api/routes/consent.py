"""
CipherTrust — Consent Routes
"""
import hashlib
import json
from datetime import datetime, timezone
from typing import Optional

import structlog
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.blockchain.algorand_client import algorand
from app.core.database import get_db
from app.models.user import ConsentRecord, Organization, ZKProof
from app.schemas.schemas import ConsentResponse
from app.services.zk_service import zk_service

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
    user_identifier: str = Form(...),
    consent_type: str = Form(...),
    purpose: str = Form(...),
    expires_at: Optional[str] = Form(None),
    document: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Organization).where(Organization.id == org_id))
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    if len(purpose) < 10:
        raise HTTPException(status_code=422, detail="Purpose must be at least 10 characters")

    # Hash the user identifier — PII never stored in plaintext
    user_hash = hashlib.sha256(f"{org_id}:{user_identifier}".encode()).hexdigest()
    granted_at = datetime.now(timezone.utc)

    # Parse optional expires_at
    parsed_expires = None
    if expires_at:
        try:
            parsed_expires = datetime.fromisoformat(expires_at)
        except ValueError:
            pass

    # Process optional document
    doc_name = None
    doc_hash = None
    if document and document.filename:
        contents = await document.read()
        doc_name = document.filename
        doc_hash = hashlib.sha256(contents).hexdigest()

    consent = ConsentRecord(
        organization_id=org_id,
        user_identifier_hash=user_hash,
        consent_type=consent_type,
        purpose=purpose,
        granted_at=granted_at,
        expires_at=parsed_expires,
        document_name=doc_name,
        document_hash=doc_hash,
    )
    db.add(consent)
    await db.flush()

    # Compute consent hash
    consent.consent_hash = _hash_consent(org_id, user_hash, consent_type, granted_at)

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

    # ── Auto-generate ZK proof for this consent record ────────────────────────
    try:
        proof = ZKProof(
            organization_id=org_id,
            proof_type="consent_compliance",
            status="generating",
            circuit_version=zk_service.CIRCUIT_VERSION,
        )
        db.add(proof)
        await db.flush()

        consent_dicts = [{
            "id": consent.id,
            "consent_hash": consent.consent_hash,
            "consent_type": consent.consent_type.value if hasattr(consent.consent_type, "value") else consent.consent_type,
            "granted_at": consent.granted_at.timestamp() if consent.granted_at else 0,
            "status": consent.status.value if hasattr(consent.status, "value") else consent.status,
        }]

        proof_result = zk_service.generate_proof(org_id, consent_dicts)
        proof.public_inputs = proof_result["public_inputs"]
        proof.proof_data = proof_result["proof"]
        proof.proof_hash = proof_result["proof_hash"]
        proof.status = "generated"

        # Auto-submit on-chain
        is_valid = zk_service.verify_proof(
            {"proof": proof.proof_data, "proof_hash": proof.proof_hash, "is_mock": True},
            proof.public_inputs or {},
        )
        proof.verification_result = is_valid
        proof.verified_at = datetime.now(timezone.utc)

        try:
            txn_id_proof = algorand.submit_proof(
                proof_hash=proof.proof_hash,
                org_id=org_id,
                compliance_type=proof.proof_type,
                verification_result=is_valid,
            )
            proof.txn_id = txn_id_proof
            proof.status = "verified" if is_valid else "failed"
        except Exception:
            proof.status = "generated"  # on-chain submission failed, keep as generated

        await db.flush()
        log.info("auto_zk_proof_created", consent_id=consent_id, proof_id=proof.id, status=proof.status)
    except Exception as e:
        log.warning("auto_zk_proof_failed", consent_id=consent_id, error=str(e))

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
