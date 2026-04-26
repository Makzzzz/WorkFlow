from sqlalchemy import DateTime, ForeignKey, func
from sqlalchemy.orm import relationship, Mapped, mapped_column

from backend.src.models.feedback_for_criteria import FeedbackForCriteria
from backend.src.models.solution import Solution
from backend.src.models.user import User
from database import Base


class Feedback(Base):
    __tablename__ = 'feedbacks'

    solution_id : Mapped[int] = mapped_column(ForeignKey('solution.id'), index=True)
    reviewer_id : Mapped[int] = mapped_column(ForeignKey('user.id'), index=True)
    overall_comment : Mapped[str | None]
    grade : Mapped[int]
    commented_at : Mapped[DateTime] = mapped_column(server_default=func.now())

    user : Mapped["User"] = relationship(
        "User",
        back_populates="reviewers"
    )
    solution : Mapped["Solution"] = relationship(
        "Solution",
        back_populates="feedbacks"
    )
    feedbacks_id : Mapped[list["FeedbackForCriteria"]] = relationship(
        "FeedbackForCriteria",
        back_populates="main_feedback"
    )
