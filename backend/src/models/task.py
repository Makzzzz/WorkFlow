from database import Base
from sqlalchemy import DateTime, ForeignKey
from sqlalchemy.orm import relationship, Mapped, mapped_column


class Task(Base):
    __tablename__ = 'task'

    task_name : Mapped[str]
    description : Mapped[str | None]
    group_id : Mapped[int] = mapped_column(ForeignKey('group.id'))
    deadline : Mapped[DateTime | None]
    if_p2p_enabled : Mapped[bool] = mapped_column(default=False)

    solution = relationship('Solution', back_populates='task')
    criteria = relationship('Criteria', back_populates='task')