from sqlalchemy import DateTime, ForeignKey, func
from sqlalchemy.orm import relationship, Mapped, mapped_column

from database import Base


class Feedback(Base):
    __tablename__ = 'feedback'

    solution_id : Mapped[int] = mapped_column(ForeignKey('solution.id'))
    reviewer_id : Mapped[int] = mapped_column(ForeignKey('user.id'))
    overall_comment : Mapped[str | None]
    grade : Mapped[int]
    commented_at : Mapped[DateTime] = mapped_column(server_default=func.now())

    solution = relationship('Solution', back_populates='feedback')
    user = relationship('User', back_populates='feedback')
    feedback_for_criteria = relationship('FeedbackForCriteria', back_populates='feedback')
