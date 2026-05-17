from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship, Mapped, mapped_column

from database import Base
from backend.src.infrastructure.dbEntities.user_status_enum import UserStatus


class UserGroup(Base):
    __tablename__ = 'users_groups'

    __table_args__ = (UniqueConstraint('user_id', 'group_id', name='unique_group_user_id'),)

    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'), index=True)
    group_id: Mapped[int] = mapped_column(ForeignKey('groups.id'), index=True)
    user_status: Mapped[UserStatus]

    user: Mapped["User"] = relationship(
        "User",
        back_populates="user_groups",
    )
    group: Mapped["Group"] = relationship(
        "Group",
        back_populates="user_groups",
    )
