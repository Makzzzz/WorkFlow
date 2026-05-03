from sqlalchemy import String, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship, Mapped, mapped_column

from backend.src.infrastructure.dbEntities.feedback import Feedback
from backend.src.infrastructure.dbEntities.solution_status_enum import SolutionStatus
from backend.src.infrastructure.dbEntities.task import Task
from backend.src.infrastructure.dbEntities.user import User
from database import Base


class Solution(Base):
    __tablename__ = 'solutions'

    student_id : Mapped[int] = mapped_column(ForeignKey('user.id'), index=True)
    task_id : Mapped[int] = mapped_column(ForeignKey('task.id'), index=True)
    status : Mapped[SolutionStatus] = mapped_column(default=SolutionStatus.NOT_PASSED)
    file_path : Mapped[str] = mapped_column(String(500))
    uploaded_at : Mapped[DateTime] = mapped_column(server_default=func.now())

    user : Mapped["User"] = relationship(
        "User",
        back_populates="students"
    )
    task : Mapped["Task"] = relationship(
        "Task",
        back_populates="solutions"
    )
    feedbacks : Mapped[list["Feedback"]] = relationship(
        "Feedback",
        back_populates="solution"
    )