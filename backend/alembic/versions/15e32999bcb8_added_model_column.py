"""added model column

Revision ID: 15e32999bcb8
Revises: 5de5b16e8d29
Create Date: 2025-03-05 21:25:19.582311

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '15e32999bcb8'
down_revision: Union[str, None] = '5de5b16e8d29'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('agents', sa.Column('model', sa.String(), nullable=True))
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column('agents', 'model')
    # ### end Alembic commands ###
