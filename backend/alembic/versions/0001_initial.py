"""Initial schema — all CipherTrust tables

Revision ID: 0001_initial
Revises:
Create Date: 2024-01-01 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── organizations ────────────────────────────────────────────────────────
    op.create_table(
        "organizations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("did", sa.String(255), unique=True, nullable=True),
        sa.Column("wallet_address", sa.String(100), unique=True, nullable=True),
        sa.Column("metadata_hash", sa.String(100), nullable=True),
        sa.Column("app_id", sa.Integer(), nullable=True),
        sa.Column("is_registered_onchain", sa.Boolean(), default=False),
        sa.Column("compliance_score", sa.Float(), default=0.0),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_organizations_id", "organizations", ["id"])
    op.create_index("ix_organizations_did", "organizations", ["did"])

    # ── users ────────────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column(
            "role",
            sa.Enum("org_admin", "regulator", "auditor", name="userrole"),
            nullable=False,
            server_default="org_admin",
        ),
        sa.Column("is_active", sa.Boolean(), default=True),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_users_id", "users", ["id"])
    op.create_index("ix_users_email", "users", ["email"])

    # ── consent_records ───────────────────────────────────────────────────────
    op.create_table(
        "consent_records",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("user_identifier_hash", sa.String(100), nullable=False),
        sa.Column(
            "consent_type",
            sa.Enum(
                "data_processing", "marketing", "analytics", "third_party_sharing",
                name="consenttype",
            ),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.Enum("active", "revoked", "expired", name="consentstatus"),
            server_default="active",
        ),
        sa.Column("purpose", sa.Text(), nullable=False),
        sa.Column("granted_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("consent_hash", sa.String(100), nullable=True),
        sa.Column("txn_id", sa.String(100), nullable=True),
        sa.Column("is_anchored", sa.Boolean(), default=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_consent_records_id", "consent_records", ["id"])
    op.create_index("ix_consent_records_org", "consent_records", ["organization_id"])

    # ── zk_proofs ─────────────────────────────────────────────────────────────
    op.create_table(
        "zk_proofs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("proof_type", sa.String(100), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "pending", "generating", "generated", "submitted", "verified", "failed",
                name="proofstatus",
            ),
            server_default="pending",
        ),
        sa.Column("public_inputs", postgresql.JSON(), nullable=True),
        sa.Column("proof_data", postgresql.JSON(), nullable=True),
        sa.Column("proof_hash", sa.String(100), nullable=True),
        sa.Column("txn_id", sa.String(100), nullable=True),
        sa.Column("app_id", sa.Integer(), nullable=True),
        sa.Column("verification_result", sa.Boolean(), nullable=True),
        sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("circuit_version", sa.String(50), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_zk_proofs_id", "zk_proofs", ["id"])
    op.create_index("ix_zk_proofs_org", "zk_proofs", ["organization_id"])

    # ── compliance_certificates ───────────────────────────────────────────────
    op.create_table(
        "compliance_certificates",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("proof_id", sa.Integer(), sa.ForeignKey("zk_proofs.id"), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "compliant", "non_compliant", "pending_review", "expired",
                name="compliancestatus",
            ),
            server_default="pending_review",
        ),
        sa.Column("regulation", sa.String(100), nullable=False, server_default="DPDPA"),
        sa.Column("asset_id", sa.Integer(), nullable=True),
        sa.Column("txn_id", sa.String(100), nullable=True),
        sa.Column("certificate_metadata", postgresql.JSON(), nullable=True),
        sa.Column("issued_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_compliance_certificates_id", "compliance_certificates", ["id"])
    op.create_index("ix_compliance_certificates_org", "compliance_certificates", ["organization_id"])


def downgrade() -> None:
    op.drop_table("compliance_certificates")
    op.drop_table("zk_proofs")
    op.drop_table("consent_records")
    op.drop_table("users")
    op.drop_table("organizations")
    op.execute("DROP TYPE IF EXISTS compliancestatus")
    op.execute("DROP TYPE IF EXISTS proofstatus")
    op.execute("DROP TYPE IF EXISTS consentstatus")
    op.execute("DROP TYPE IF EXISTS consenttype")
    op.execute("DROP TYPE IF EXISTS userrole")
