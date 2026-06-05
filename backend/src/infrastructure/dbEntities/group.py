from uuid import uuid4

from sqlalchemy import String
from sqlalchemy.orm import relationship, Mapped, mapped_column

from database import Base


class Group(Base):
    __tablename__ = 'groups'

    group_name: Mapped[str]
    description: Mapped[str | None]
    invite_token: Mapped[str] = mapped_column(String(36), unique=True, default=uuid4)

    user_groups: Mapped[list["UserGroup"]] = relationship(
        "UserGroup",
        back_populates="group",
    )
    task: Mapped[list["Task"]] = relationship(
        "Task",
        back_populates="group",
    )
