"""fix cost

Revision ID: 5de5b16e8d29
Revises: cae4a5f82f18
Create Date: 2025-03-02 21:17:28.976013

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5de5b16e8d29'
down_revision: Union[str, None] = 'cae4a5f82f18'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.alter_column('agents', 'cost',
               existing_type=sa.INTEGER(),
               type_=sa.Float(),
               existing_nullable=True)
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.alter_column('agents', 'cost',
               existing_type=sa.Float(),
               type_=sa.INTEGER(),
               existing_nullable=True)
    # ### end Alembic commands ###
