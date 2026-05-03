from backend.src.infrastructure.dbEntities.criteria import Criteria
from backend.src.infrastructure.dbEntities.group import Group
from backend.src.infrastructure.dbEntities.solution import Solution
from database import Base
from sqlalchemy import DateTime, ForeignKey
from sqlalchemy.orm import relationship, Mapped, mapped_column


class Task(Base):
    __tablename__ = 'tasks'

    task_name : Mapped[str]
    description : Mapped[str | None]
    group_id : Mapped[int] = mapped_column(ForeignKey('group.id'), index=True)
    deadline : Mapped[DateTime | None]
    if_p2p_enabled : Mapped[bool] = mapped_column(default=False)

    group : Mapped["Group"] = relationship(
        "Group",
        back_populates="task",
    )
    solutions : Mapped[list["Solution"]] = relationship(
        "Solution",
        back_populates="task",
    )
    criterias : Mapped[list["Criteria"]] = relationship(
        "Criteria",
        back_populates="task",
    )