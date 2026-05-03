from sqlalchemy import String, DateTime, func
from sqlalchemy.orm import relationship, Mapped, mapped_column

from backend.src.infrastructure.dbEntities.feedback import Feedback
from backend.src.infrastructure.dbEntities.refresh_token import RefreshToken
from backend.src.infrastructure.dbEntities.solution import Solution
from backend.src.infrastructure.dbEntities.user_group import UserGroup
from database import Base


class User(Base):
    __tablename__ = 'users'

    email : Mapped[str] = mapped_column(unique=True)
    first_name : Mapped[str] = mapped_column(String(50))
    last_name : Mapped[str | None] = mapped_column(String(50))
    password : Mapped[str] = mapped_column(String(255))
    created_at : Mapped[DateTime] = mapped_column(server_default=func.now())
    last_login : Mapped[DateTime | None]

    user_groups : Mapped[list["UserGroup"]] = relationship(
        "UserGroup",
        back_populates= "user"
    )
    students : Mapped[list["Solution"]] = relationship(
        "Solution",
        back_populates= "user"
    )
    reviewers : Mapped[list["Feedback"]] = relationship(
        "Feedback",
        back_populates= "user"
    )
    tokens : Mapped[list["RefreshToken"]] = relationship(
        "RefreshToken",
        back_populates= "user"
    )