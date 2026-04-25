from sqlalchemy import ForeignKey
from sqlalchemy.orm import relationship, Mapped, mapped_column

from database import Base
from user_status_enum import UserStatus
from backend.src.models.user import User
from backend.src.models.group import Group

class UserGroup(Base):
    __tablename__ = 'users_groups'

    user_id : Mapped[int] = mapped_column(ForeignKey('user.id'))
    group_id : Mapped[int] = mapped_column(ForeignKey('group.id'))#Column(Integer, ForeignKey('group.id'))
    user_status : Mapped[UserStatus]

    user : Mapped["User"] = relationship(
        "User",
        back_populates="user_groups",
    )
    group : Mapped["Group"] = relationship(
        "Group",
        back_populates="user_groups",
    )