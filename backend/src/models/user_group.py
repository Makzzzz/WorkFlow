from sqlalchemy import ForeignKey
from sqlalchemy.orm import relationship, Mapped, mapped_column

from database import Base


class UserGroup(Base):
    __tablename__ = 'user_group'

    user_id : Mapped[int] = mapped_column(ForeignKey('user.id'))
    group_id : Mapped[int] = mapped_column(ForeignKey('group.id'))#Column(Integer, ForeignKey('group.id'))
    is_owner : Mapped[bool] = mapped_column(default=False)

    user = relationship("User", back_populates="user_group")
    group = relationship("Group", back_populates="user_group")