from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import relationship, Mapped, mapped_column

from database import Base


class Criteria(Base):
    __tablename__ = 'criterias'

    criteria_name: Mapped[str] = mapped_column(String(100))
    task_id: Mapped[int] = mapped_column(ForeignKey('tasks.id'), index=True)

    task: Mapped["Task"] = relationship(
        "Task",
        back_populates="criterias"
    )
    criteria_ids: Mapped[list["FeedbackForCriteria"]] = relationship(
        "FeedbackForCriteria",
        back_populates="criteria"
    )
