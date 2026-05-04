from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship, Mapped, mapped_column

from backend.src.infrastructure.dbEntities.criteria import Criteria
from backend.src.infrastructure.dbEntities.feedback import Feedback
from database import Base


class FeedbackForCriteria(Base):
    __tablename__ = 'feedbacks_for_criteria'

    __table_args__ = (
        UniqueConstraint('feedback_id', 'criteria_id', name='unique_criteria_id'))

    criteria_id: Mapped[int] = mapped_column(ForeignKey('criteria.id'), index=True)
    feedback_id: Mapped[int] = mapped_column(ForeignKey('feedback.id'), index=True)
    comment: Mapped[str | None]

    main_feedback: Mapped["Feedback"] = relationship(
        "Feedback",
        back_populates="feedbacks_id"
    )
    criteria: Mapped["Criteria"] = relationship(
        "Criteria",
        back_populates="criteria_ids"
    )
