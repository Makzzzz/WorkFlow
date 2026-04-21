from sqlalchemy import String, DateTime, func
from sqlalchemy.orm import relationship, Mapped, mapped_column

from database import Base


class User(Base):
    __tablename__ = 'user'

    email : Mapped[str] = mapped_column(unique=True)
    first_name : Mapped[str] = mapped_column(String(50))
    last_name : Mapped[str | None] = mapped_column(String(50))
    password : Mapped[str] = mapped_column(String(255))
    created_at : Mapped[DateTime] = mapped_column(server_default=func.now())
    last_login : Mapped[DateTime | None]


    user_group = relationship('UserGroup', back_populates='user')
    solution = relationship('Solution', back_populates='user')
    feedback = relationship('Feedback', back_populates='user')
