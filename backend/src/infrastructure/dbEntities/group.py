from sqlalchemy import String
from sqlalchemy.orm import relationship, Mapped, mapped_column

from database import Base


class Group(Base):
    __tablename__ = 'groups'

    group_name: Mapped[str]
    description: Mapped[str | None]
    invite_code: Mapped[str] = mapped_column(String(6), unique=True)

    user_groups: Mapped[list["UserGroup"]] = relationship(
        "UserGroup",
        back_populates="group",
    )
    task: Mapped[list["Task"]] = relationship(
        "Task",
        back_populates="group",
    )
