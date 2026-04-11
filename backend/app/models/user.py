"""
CipherTrust Database Models
"""

import enum
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean, Column, DateTime, Enum, ForeignKey,
    Integer, String, Text, JSON, Float
)
from sqlalchemy.orm import relationship

from app.core.database import Base


def utcnow():
    return datetime.now(timezone.utc)


# ─── Enums ────────────────────────────────────────────────────────────────────

class UserRole(str, enum.Enum):
    ORG_ADMIN = "org_admin"
    REGULATOR = "regulator"
    AUDITOR = "auditor"


class ConsentType(str, enum.Enum):
    DATA_PROCESSING = "data_processing"
    MARKETING = "marketing"
    ANALYTICS = "analytics"
    THIRD_PARTY_SHARING = "third_party_sharing"


class ConsentStatus(str, enum.Enum):
    ACTIVE = "active"
    REVOKED = "revoked"
    EXPIRED = "expired"


class ProofStatus(str, enum.Enum):
    PENDING = "pending"
    GENERATING = "generating"
    GENERATED = "generated"
    SUBMITTED = "submitted"
    VERIFIED = "verified"
    FAILED = "failed"


class ComplianceStatus(str, enum.Enum):
    COMPLIANT = "compliant"
    NON_COMPLIANT = "non_compliant"
    PENDING_REVIEW = "pending_review"
    EXPIRED = "expired"


# ─── Models ───────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.ORG_ADMIN, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=True)
    organization = relationship("Organization", back_populates="users")


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    did = Column(String(255), unique=True, nullable=True, index=True)  # on-chain DID
    wallet_address = Column(String(100), unique=True, nullable=True)
    metadata_hash = Column(String(100), nullable=True)  # IPFS/on-chain metadata hash
    app_id = Column(Integer, nullable=True)  # Algorand Identity contract app ID
    is_registered_onchain = Column(Boolean, default=False)
    compliance_score = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    users = relationship("User", back_populates="organization")
    consents = relationship("ConsentRecord", back_populates="organization")
    proofs = relationship("ZKProof", back_populates="organization")
    certificates = relationship("ComplianceCertificate", back_populates="organization")


class ConsentRecord(Base):
    __tablename__ = "consent_records"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    user_identifier_hash = Column(String(100), nullable=False)  # hashed user ID — no PII stored
    consent_type = Column(Enum(ConsentType), nullable=False)
    status = Column(Enum(ConsentStatus), default=ConsentStatus.ACTIVE)
    purpose = Column(Text, nullable=False)
    granted_at = Column(DateTime(timezone=True), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    revoked_at = Column(DateTime(timezone=True), nullable=True)

    # On-chain anchoring
    consent_hash = Column(String(100), nullable=True)     # keccak256 of consent data
    txn_id = Column(String(100), nullable=True)           # Algorand transaction ID
    is_anchored = Column(Boolean, default=False)

    created_at = Column(DateTime(timezone=True), default=utcnow)

    organization = relationship("Organization", back_populates="consents")


class ZKProof(Base):
    __tablename__ = "zk_proofs"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    proof_type = Column(String(100), nullable=False)       # e.g. "consent_compliance"
    status = Column(Enum(ProofStatus), default=ProofStatus.PENDING)

    # ZK Proof data
    public_inputs = Column(JSON, nullable=True)            # public signals
    proof_data = Column(JSON, nullable=True)               # {pi_a, pi_b, pi_c, protocol}
    proof_hash = Column(String(100), nullable=True)        # hash of the proof

    # On-chain
    txn_id = Column(String(100), nullable=True)
    app_id = Column(Integer, nullable=True)
    verification_result = Column(Boolean, nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)

    # Metadata
    circuit_version = Column(String(50), nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    organization = relationship("Organization", back_populates="proofs")


class ComplianceCertificate(Base):
    __tablename__ = "compliance_certificates"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    proof_id = Column(Integer, ForeignKey("zk_proofs.id"), nullable=False)
    status = Column(Enum(ComplianceStatus), default=ComplianceStatus.PENDING_REVIEW)
    regulation = Column(String(100), nullable=False, default="DPDPA")

    # NFT / ASA details
    asset_id = Column(Integer, nullable=True)              # Algorand ASA ID
    txn_id = Column(String(100), nullable=True)
    certificate_metadata = Column(JSON, nullable=True)

    issued_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    organization = relationship("Organization", back_populates="certificates")
