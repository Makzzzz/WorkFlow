"""add_annotations_table

Revision ID: c1d2e3f4a5b6
Revises: c7c591be3cd7
Create Date: 2026-06-11 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c1d2e3f4a5b6'
down_revision: Union[str, Sequence[str], None] = 'c7c591be3cd7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('annotations',
    sa.Column('solution_id', sa.Integer(), nullable=False),
    sa.Column('file_key', sa.String(length=500), nullable=False),
    sa.Column('data', sa.JSON(), nullable=False),
    sa.Column('last_edited_by', sa.Integer(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.ForeignKeyConstraint(['solution_id'], ['solutions.id'], ),
    sa.ForeignKeyConstraint(['last_edited_by'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('solution_id', 'file_key', name='uq_annotation_solution_file')
    )
    op.create_index(op.f('ix_annotations_solution_id'), 'annotations', ['solution_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_annotations_solution_id'), table_name='annotations')
    op.drop_table('annotations')
