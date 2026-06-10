from datetime import datetime

from sqlalchemy import String, ForeignKey, func
from sqlalchemy.orm import relationship, Mapped, mapped_column
from backend.src.infrastructure.dbEntities.feedback import Feedback
from backend.src.infrastructure.dbEntities.solution_status_enum import SolutionStatus
from backend.src.infrastructure.dbEntities.task import Task
from backend.src.infrastructure.dbEntities.user import User
from database import Base


class Solution(Base):
    __tablename__ = 'solutions'

    student_id: Mapped[int] = mapped_column(ForeignKey('users.id'), index=True)
    task_id: Mapped[int] = mapped_column(ForeignKey('tasks.id'), index=True)
    status: Mapped[SolutionStatus] = mapped_column(default=SolutionStatus.NOT_PASSED)
    file_path: Mapped[str] = mapped_column(String(500))
    uploaded_at: Mapped[datetime] = mapped_column(server_default=func.now())
    reviewer_id: Mapped[int | None] = mapped_column(ForeignKey('users.id'), index=True, default=None)

    user: Mapped["User"] = relationship(
        "User",
        back_populates="students",
        foreign_keys=[student_id]
    )
    task: Mapped["Task"] = relationship(
        "Task",
        back_populates="solutions"
    )
    feedbacks: Mapped[list["Feedback"]] = relationship(
        "Feedback",
        back_populates="solution"
    )
    user_reviewer: Mapped["User"] = relationship(
        "User",
        back_populates="solution_reviewers",
        foreign_keys=[reviewer_id]
    )
