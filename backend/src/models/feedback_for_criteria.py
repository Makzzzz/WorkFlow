from sqlalchemy import ForeignKey
from sqlalchemy.orm import relationship, Mapped, mapped_column

from database import Base


class FeedbackForCriteria(Base):
    __tablename__ = 'feedback_for_criteria'

    criteria_id : Mapped[int] = mapped_column(ForeignKey('criteria.id'))
    feedback_id : Mapped[int] = mapped_column(ForeignKey('feedback.id'))
    comment : Mapped[str | None]

    feedback = relationship('Feedback', back_populates='feedback_for_criteria')
    criteria = relationship('Criteria', back_populates='feedback_for_criteria')