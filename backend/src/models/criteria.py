from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship, Mapped, mapped_column

from backend.src.models.feedback_for_criteria import FeedbackForCriteria
from backend.src.models.task import Task
from database import Base


class Criteria(Base):
    __tablename__ = 'criterias'

    criteria_name : Mapped[str] = mapped_column(String(100))
    task_id : Mapped[int] = mapped_column(ForeignKey('task.id'))

    task : Mapped["Task"] = relationship(
        "Task",
        back_populates="criterias"
    )
    criteria_ids : Mapped[list["FeedbackForCriteria"]] = relationship(
        "FeedbackForCriteria",
        back_populates="criteria"
    )