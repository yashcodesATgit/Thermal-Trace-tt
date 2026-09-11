"""Add land_cover columns to hotspots

Revision ID: a3f7e8c91d02
Revises: 1402df3fc05d
Create Date: 2026-09-05 01:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a3f7e8c91d02'
down_revision: Union[str, None] = '1402df3fc05d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('hotspots', sa.Column('land_cover_class', sa.Integer(), nullable=True))
    op.add_column('hotspots', sa.Column('land_cover_name', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('hotspots', 'land_cover_name')
    op.drop_column('hotspots', 'land_cover_class')
