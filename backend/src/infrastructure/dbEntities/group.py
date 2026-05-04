from sqlalchemy.orm import relationship, Mapped
from backend.src.infrastructure.dbEntities.task import Task
from database import Base
from backend.src.infrastructure.dbEntities.user_group import UserGroup


class Group(Base):
    __tablename__ = 'groups'

    group_name: Mapped[str]
    description: Mapped[str | None]

    user_groups: Mapped[list["UserGroup"]] = relationship(
        "UserGroup",
        back_populates="group",
    )
    task: Mapped[list["Task"]] = relationship(
        "Task",
        back_populates="group",
    )
