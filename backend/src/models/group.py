from sqlalchemy.orm import relationship, Mapped

from database import Base


class Group(Base):
    __tablename__ = 'group'

    group_name : Mapped[str]
    description : Mapped[str | None]

    user_group = relationship('UserGroup', back_populates='group')
    task = relationship('Task', back_populates='group')
