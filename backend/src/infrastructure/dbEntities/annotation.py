from datetime import datetime

from sqlalchemy import ForeignKey, String, JSON, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class Annotation(Base):
    __tablename__ = 'annotations'
    __table_args__ = (
        UniqueConstraint('solution_id', 'file_key', name='uq_annotation_solution_file'),
    )

    solution_id: Mapped[int] = mapped_column(ForeignKey('solutions.id'), index=True)
    file_key: Mapped[str] = mapped_column(String(500))
    data: Mapped[dict] = mapped_column(JSON)
    last_edited_by: Mapped[int] = mapped_column(ForeignKey('users.id'))
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())
