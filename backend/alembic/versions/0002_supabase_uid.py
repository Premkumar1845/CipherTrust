"""add supabase_uid to users

Revision ID: 0002
Revises: 0001_initial
Create Date: 2026-04-11
"""
from alembic import op
import sqlalchemy as sa

revision = "0002_supabase_uid"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("supabase_uid", sa.String(255), nullable=True))
    op.create_index("ix_users_supabase_uid", "users", ["supabase_uid"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_users_supabase_uid", table_name="users")
    op.drop_column("users", "supabase_uid")
