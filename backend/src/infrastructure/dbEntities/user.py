from datetime import datetime

from sqlalchemy import String, func
from sqlalchemy.orm import relationship, Mapped, mapped_column

from database import Base


class User(Base):
    __tablename__ = 'users'

    email: Mapped[str] = mapped_column(unique=True)
    first_name: Mapped[str] = mapped_column(String(50))
    last_name: Mapped[str | None] = mapped_column(String(50))
    password: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    last_login: Mapped[datetime | None]
    is_active: Mapped[bool] = mapped_column(default=True)

    user_groups: Mapped[list["UserGroup"]] = relationship(
        "UserGroup",
        back_populates="user"
    )
    students: Mapped[list["Solution"]] = relationship(
        "Solution",
        back_populates="user",
        foreign_keys="Solution.student_id"
    )
    reviewers: Mapped[list["Feedback"]] = relationship(
        "Feedback",
        back_populates="user"
    )
    tokens: Mapped[list["RefreshToken"]] = relationship(
        "RefreshToken",
        back_populates="user"
    )
    verification_codes: Mapped[list["VerificationCodeDB"]] = relationship(
        "VerificationCodeDB",
        back_populates="user"
    )
    comment_patterns: Mapped[list["CommentPattern"]] = relationship(
        "CommentPattern",
        back_populates="user"
    )
    solution_reviewers: Mapped[list["Solution"]] = relationship(
        "Solution",
        back_populates="user_reviewer",
        foreign_keys="Solution.reviewer_id"
    )
