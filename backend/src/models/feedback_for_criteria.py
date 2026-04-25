from sqlalchemy import ForeignKey
from sqlalchemy.orm import relationship, Mapped, mapped_column

from backend.src.models.criteria import Criteria
from backend.src.models.feedback import Feedback
from database import Base


class FeedbackForCriteria(Base):
    __tablename__ = 'feedbacks_for_criteria'

    criteria_id : Mapped[int] = mapped_column(ForeignKey('criteria.id'))
    feedback_id : Mapped[int] = mapped_column(ForeignKey('feedback.id'))
    comment : Mapped[str | None]

    main_feedback : Mapped["Feedback"] = relationship(
        "Feedback",
        back_populates="feedbacks_id"
    )
    criteria : Mapped["Criteria"] = relationship(
        "Criteria",
        back_populates="criteria_ids"
    )