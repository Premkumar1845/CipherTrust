"""Add document fields to consent_records

Revision ID: 0002_consent_document
Revises: 0001_initial
Create Date: 2026-04-14
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0004_consent_document"
down_revision: Union[str, None] = "0003_analytics_idx"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("consent_records", sa.Column("document_name", sa.String(255), nullable=True))
    op.add_column("consent_records", sa.Column("document_hash", sa.String(100), nullable=True))


def downgrade() -> None:
    op.drop_column("consent_records", "document_hash")
    op.drop_column("consent_records", "document_name")
