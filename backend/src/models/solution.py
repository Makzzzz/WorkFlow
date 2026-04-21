from sqlalchemy import String, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship, Mapped, mapped_column

from database import Base


class Solution(Base):
    __tablename__ = 'solution'

    student_id : Mapped[int] = mapped_column(ForeignKey('user.id'))
    task_id : Mapped[int] = mapped_column(ForeignKey('task.id'))
    is_checked : Mapped[bool] = mapped_column(default=False)
    file_path : Mapped[str] = mapped_column(String(500))
    uploaded_at : Mapped[DateTime] = mapped_column(server_default=func.now())

    user = relationship('User', back_populates='solution')
    task = relationship('Task', back_populates='solution')
    feedback = relationship('Feedback', back_populates='solution')