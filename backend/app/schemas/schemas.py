"""
CipherTrust — Pydantic Schemas (request/response validation)
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, EmailStr, Field


# ─── Auth ─────────────────────────────────────────────────────────────────────

class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=2)
    role: str = "org_admin"


class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    role: str


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    organization_id: Optional[int]
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Organization ─────────────────────────────────────────────────────────────

class OrgCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    wallet_address: Optional[str] = None


class OrgRegisterOnchainRequest(BaseModel):
    wallet_address: str
    signed_txn: Optional[str] = None  # base64 signed transaction from Pera Wallet


class OrgResponse(BaseModel):
    id: int
    name: str
    did: Optional[str]
    wallet_address: Optional[str]
    is_registered_onchain: bool
    compliance_score: float
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Consent ──────────────────────────────────────────────────────────────────

class ConsentCreateRequest(BaseModel):
    user_identifier: str = Field(description="Raw user ID — will be hashed before storage")
    consent_type: str
    purpose: str = Field(min_length=10)
    expires_at: Optional[datetime] = None


class ConsentResponse(BaseModel):
    id: int
    organization_id: int
    user_identifier_hash: str
    consent_type: str
    status: str
    purpose: str
    granted_at: datetime
    expires_at: Optional[datetime]
    consent_hash: Optional[str]
    txn_id: Optional[str]
    is_anchored: bool

    model_config = {"from_attributes": True}


class ConsentAnchorRequest(BaseModel):
    consent_id: int


# ─── ZK Proofs ────────────────────────────────────────────────────────────────

class ProofGenerateRequest(BaseModel):
    proof_type: str = "consent_compliance"
    consent_ids: List[int] = Field(description="IDs of consent records to include in proof")


class ProofSubmitRequest(BaseModel):
    proof_id: int


class ProofResponse(BaseModel):
    id: int
    organization_id: int
    proof_type: str
    status: str
    public_inputs: Optional[Dict[str, Any]]
    proof_hash: Optional[str]
    txn_id: Optional[str]
    verification_result: Optional[bool]
    verified_at: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Compliance ───────────────────────────────────────────────────────────────

class CertificateResponse(BaseModel):
    id: int
    organization_id: int
    proof_id: int
    status: str
    regulation: str
    asset_id: Optional[int]
    txn_id: Optional[str]
    issued_at: Optional[datetime]
    expires_at: Optional[datetime]

    model_config = {"from_attributes": True}


class ComplianceSummary(BaseModel):
    organization_id: int
    organization_name: str
    compliance_score: float
    total_consents: int
    active_consents: int
    total_proofs: int
    verified_proofs: int
    latest_certificate: Optional[CertificateResponse]
    is_compliant: bool
