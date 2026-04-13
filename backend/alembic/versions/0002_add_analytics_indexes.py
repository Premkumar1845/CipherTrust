"""Add composite indexes for analytics performance

Revision ID: 0003_analytics_idx
Revises: 0002_supabase_uid
Create Date: 2025-01-01 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op

revision: str = "0003_analytics_idx"
down_revision: Union[str, None] = "0002_supabase_uid"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # consent_records: analytics queries filter by (org_id, status) and (org_id, created_at)
    op.create_index(
        "ix_consent_org_status",
        "consent_records",
        ["organization_id", "status"],
    )
    op.create_index(
        "ix_consent_org_created",
        "consent_records",
        ["organization_id", "created_at"],
    )

    # zk_proofs: analytics queries filter by (org_id, status) and (org_id, created_at)
    op.create_index(
        "ix_zkproof_org_status",
        "zk_proofs",
        ["organization_id", "status"],
    )
    op.create_index(
        "ix_zkproof_org_created",
        "zk_proofs",
        ["organization_id", "created_at"],
    )

    # compliance_certificates: filtered by (org_id, status, expires_at)
    op.create_index(
        "ix_cert_org_status_expires",
        "compliance_certificates",
        ["organization_id", "status", "expires_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_cert_org_status_expires", "compliance_certificates")
    op.drop_index("ix_zkproof_org_created", "zk_proofs")
    op.drop_index("ix_zkproof_org_status", "zk_proofs")
    op.drop_index("ix_consent_org_created", "consent_records")
    op.drop_index("ix_consent_org_status", "consent_records")
