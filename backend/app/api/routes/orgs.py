"""
CipherTrust — Organization Routes
"""
import hashlib

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.blockchain.algorand_client import algorand
from app.core.database import get_db
from app.models.user import Organization
from app.schemas.schemas import OrgCreateRequest, OrgRegisterOnchainRequest, OrgResponse

router = APIRouter()


@router.post("/", response_model=OrgResponse, status_code=201)
async def create_org(payload: OrgCreateRequest, db: AsyncSession = Depends(get_db)):
    org = Organization(
        name=payload.name,
        wallet_address=payload.wallet_address,
    )
    db.add(org)
    await db.flush()
    await db.refresh(org)
    return org


@router.get("/", response_model=list[OrgResponse])
async def list_orgs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Organization))
    return result.scalars().all()


@router.get("/{org_id}", response_model=OrgResponse)
async def get_org(org_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Organization).where(Organization.id == org_id))
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org


@router.post("/{org_id}/register-onchain", response_model=OrgResponse)
async def register_onchain(
    org_id: int,
    payload: OrgRegisterOnchainRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Organization).where(Organization.id == org_id))
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    if org.is_registered_onchain:
        raise HTTPException(status_code=400, detail="Organization already registered on-chain")

    # Build metadata hash (org name + wallet address)
    metadata = f"{org.name}:{payload.wallet_address}"
    metadata_hash = hashlib.sha256(metadata.encode()).hexdigest()

    # Check if this wallet is already linked to another org
    existing = await db.execute(
        select(Organization).where(
            Organization.wallet_address == payload.wallet_address,
            Organization.id != org_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="This wallet address is already linked to another organization")

    try:
        result_data = algorand.register_org(org.name, metadata_hash)
        # DID uses the org's wallet address (unique per org)
        org.did = f"did:algo:{payload.wallet_address}"
        org.wallet_address = payload.wallet_address
        org.metadata_hash = result_data["metadata_hash"]
        org.is_registered_onchain = True
        await db.flush()
        await db.refresh(org)
        return org
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Blockchain registration failed: {str(e)}")
