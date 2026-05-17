from datetime import datetime

from sqlalchemy import ForeignKey, func
from sqlalchemy.orm import relationship, Mapped, mapped_column

from database import Base


class Feedback(Base):
    __tablename__ = 'feedbacks'

    solution_id: Mapped[int] = mapped_column(ForeignKey('solutions.id'), index=True)
    reviewer_id: Mapped[int] = mapped_column(ForeignKey('users.id'), index=True)
    overall_comment: Mapped[str | None]
    grade: Mapped[int]
    commented_at: Mapped[datetime] = mapped_column(server_default=func.now())

    user: Mapped["User"] = relationship(
        "User",
        back_populates="reviewers"
    )
    solution: Mapped["Solution"] = relationship(
        "Solution",
        back_populates="feedbacks"
    )
    feedbacks_id: Mapped[list["FeedbackForCriteria"]] = relationship(
        "FeedbackForCriteria",
        back_populates="main_feedback"
    )
