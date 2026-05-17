from datetime import datetime

from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.src.infrastructure.dbEntities.user import User
from database import Base


class RefreshToken(Base):
    __tablename__ = "refresh_token"

    token: Mapped[str] = mapped_column(String(500), unique=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    expire_at: Mapped[datetime] = mapped_column(nullable=False)

    user: Mapped["User"] = relationship(
        "User",
        back_populates="tokens"
    )
