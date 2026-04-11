"""
CipherTrust — Compliance Routes
"""
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.blockchain.algorand_client import algorand
from app.core.database import get_db
from app.models.user import (
    ComplianceCertificate, ConsentRecord, Organization, ZKProof
)
from app.schemas.schemas import CertificateResponse, ComplianceSummary

router = APIRouter()


@router.post("/{org_id}/issue-certificate", response_model=CertificateResponse, status_code=201)
async def issue_certificate(
    org_id: int,
    proof_id: int,
    regulation: str = "DPDPA",
    db: AsyncSession = Depends(get_db),
):
    """Issue a compliance certificate (NFT/ASA) for a verified proof."""
    result = await db.execute(
        select(ZKProof).where(
            ZKProof.id == proof_id,
            ZKProof.organization_id == org_id,
            ZKProof.status == "verified",
        )
    )
    proof = result.scalar_one_or_none()
    if not proof:
        raise HTTPException(
            status_code=404,
            detail="Verified proof not found. Submit and verify a proof first.",
        )

    now = datetime.now(timezone.utc)
    cert = ComplianceCertificate(
        organization_id=org_id,
        proof_id=proof_id,
        status="compliant",
        regulation=regulation,
        certificate_metadata={
            "proof_hash": proof.proof_hash,
            "public_inputs": proof.public_inputs,
            "issued_by": "CipherTrust",
            "regulation": regulation,
        },
        issued_at=now,
        expires_at=now + timedelta(days=365),
    )
    db.add(cert)
    await db.flush()

    try:
        onchain = algorand.issue_certificate(org_id, proof_id, regulation)
        cert.txn_id = onchain["txn_id"]
        cert.asset_id = onchain.get("asset_id")
        await db.flush()
        await db.refresh(cert)
        return cert
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Certificate issuance failed: {str(e)}")


@router.get("/{org_id}/certificates", response_model=list[CertificateResponse])
async def list_certificates(org_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ComplianceCertificate).where(
            ComplianceCertificate.organization_id == org_id
        )
    )
    return result.scalars().all()


@router.get("/{org_id}/summary", response_model=ComplianceSummary)
async def compliance_summary(org_id: int, db: AsyncSession = Depends(get_db)):
    """Full compliance summary for regulator / auditor view."""
    result = await db.execute(select(Organization).where(Organization.id == org_id))
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    total_consents = await db.scalar(
        select(func.count()).where(ConsentRecord.organization_id == org_id)
    )
    active_consents = await db.scalar(
        select(func.count()).where(
            ConsentRecord.organization_id == org_id,
            ConsentRecord.status == "active",
        )
    )
    total_proofs = await db.scalar(
        select(func.count()).where(ZKProof.organization_id == org_id)
    )
    verified_proofs = await db.scalar(
        select(func.count()).where(
            ZKProof.organization_id == org_id,
            ZKProof.status == "verified",
        )
    )

    cert_result = await db.execute(
        select(ComplianceCertificate)
        .where(ComplianceCertificate.organization_id == org_id)
        .order_by(ComplianceCertificate.issued_at.desc())
        .limit(1)
    )
    latest_cert = cert_result.scalar_one_or_none()

    is_compliant = (
        latest_cert is not None
        and latest_cert.status == "compliant"
        and (latest_cert.expires_at is None or latest_cert.expires_at > datetime.now(timezone.utc))
    )

    return ComplianceSummary(
        organization_id=org_id,
        organization_name=org.name,
        compliance_score=org.compliance_score,
        total_consents=total_consents or 0,
        active_consents=active_consents or 0,
        total_proofs=total_proofs or 0,
        verified_proofs=verified_proofs or 0,
        latest_certificate=latest_cert,
        is_compliant=is_compliant,
    )


@router.get("/verify/{txn_id}")
async def verify_by_txn(txn_id: str):
    """Public endpoint — verify a compliance proof by Algorand transaction ID."""
    try:
        txn = algorand.get_transaction(txn_id)
        return {
            "txn_id": txn_id,
            "verified": True,
            "block": txn.get("confirmed-round"),
            "timestamp": txn.get("round-time"),
            "note": txn.get("txn", {}).get("note"),
        }
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Transaction not found: {str(e)}")
