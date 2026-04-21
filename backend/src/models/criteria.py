from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship, Mapped, mapped_column

from database import Base


class Criteria(Base):
    __tablename__ = 'criteria'

    criteria_name : Mapped[str] = mapped_column(String(100))
    task_id : Mapped[int] = mapped_column(ForeignKey('task.id'))

    task = relationship('Task', back_populates='criteria')
    feedback_for_criteria = relationship('FeedbackForCriteria', back_populates='criteria')