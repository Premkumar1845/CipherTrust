"""
CipherTrust — ZK Proof Routes
"""
import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.blockchain.algorand_client import algorand
from app.core.database import get_db
from app.models.user import ConsentRecord, Organization, ZKProof
from app.schemas.schemas import ProofGenerateRequest, ProofResponse, ProofSubmitRequest
from app.services.zk_service import zk_service

router = APIRouter()


@router.post("/{org_id}/generate", response_model=ProofResponse, status_code=201)
async def generate_proof(
    org_id: int,
    payload: ProofGenerateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Generate a ZK proof for the specified consent records."""
    result = await db.execute(select(Organization).where(Organization.id == org_id))
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Fetch the consent records
    result = await db.execute(
        select(ConsentRecord).where(
            ConsentRecord.id.in_(payload.consent_ids),
            ConsentRecord.organization_id == org_id,
            ConsentRecord.status == "active",
        )
    )
    consents = result.scalars().all()

    if not consents:
        raise HTTPException(
            status_code=400,
            detail="No active consent records found for the given IDs",
        )

    # Create proof record
    proof = ZKProof(
        organization_id=org_id,
        proof_type=payload.proof_type,
        status="generating",
        circuit_version=zk_service.CIRCUIT_VERSION,
    )
    db.add(proof)
    await db.flush()

    try:
        consent_dicts = [
            {
                "id": c.id,
                "consent_hash": c.consent_hash,
                "consent_type": c.consent_type,
                "granted_at": c.granted_at.timestamp() if c.granted_at else 0,
                "status": c.status,
            }
            for c in consents
        ]

        proof_result = zk_service.generate_proof(org_id, consent_dicts)

        proof.public_inputs = proof_result["public_inputs"]
        proof.proof_data = proof_result["proof"]
        proof.proof_hash = proof_result["proof_hash"]
        proof.status = "generated"

        await db.flush()
        await db.refresh(proof)
        return proof

    except Exception as e:
        proof.status = "failed"
        proof.error_message = str(e)
        await db.flush()
        raise HTTPException(status_code=500, detail=f"Proof generation failed: {str(e)}")


@router.post("/{org_id}/submit/{proof_id}", response_model=ProofResponse)
async def submit_proof(
    org_id: int,
    proof_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Verify proof off-chain and submit proof hash to Algorand."""
    result = await db.execute(
        select(ZKProof).where(
            ZKProof.id == proof_id,
            ZKProof.organization_id == org_id,
        )
    )
    proof = result.scalar_one_or_none()
    if not proof:
        raise HTTPException(status_code=404, detail="Proof not found")
    if proof.status not in ("generated",):
        raise HTTPException(
            status_code=400,
            detail=f"Proof cannot be submitted in status '{proof.status}'",
        )

    # Off-chain verification
    is_valid = zk_service.verify_proof(
        {"proof": proof.proof_data, "proof_hash": proof.proof_hash, "is_mock": True},
        proof.public_inputs or {},
    )

    proof.verification_result = is_valid
    proof.verified_at = datetime.now(timezone.utc)

    try:
        txn_id = algorand.submit_proof(
            proof_hash=proof.proof_hash,
            org_id=org_id,
            compliance_type=proof.proof_type,
            verification_result=is_valid,
        )
        proof.txn_id = txn_id
        proof.status = "verified" if is_valid else "failed"

        # Update org compliance score
        result2 = await db.execute(select(Organization).where(Organization.id == org_id))
        org = result2.scalar_one_or_none()
        if org and is_valid:
            org.compliance_score = min(100.0, org.compliance_score + 10.0)

        await db.flush()
        await db.refresh(proof)
        return proof

    except Exception as e:
        proof.status = "failed"
        proof.error_message = str(e)
        await db.flush()
        raise HTTPException(status_code=500, detail=f"On-chain submission failed: {str(e)}")


@router.get("/{org_id}", response_model=list[ProofResponse])
async def list_proofs(org_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ZKProof).where(ZKProof.organization_id == org_id)
    )
    return result.scalars().all()


@router.get("/{org_id}/{proof_id}", response_model=ProofResponse)
async def get_proof(org_id: int, proof_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ZKProof).where(
            ZKProof.id == proof_id,
            ZKProof.organization_id == org_id,
        )
    )
    proof = result.scalar_one_or_none()
    if not proof:
        raise HTTPException(status_code=404, detail="Proof not found")
    return proof
