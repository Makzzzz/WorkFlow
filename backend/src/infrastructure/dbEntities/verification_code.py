from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from database import Base


class VerificationCodeDB(Base):
    """Модель базы данных для хранения кодов подтверждения."""
    __tablename__ = 'verification_codes'
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(10), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    
    user: Mapped["User"] = relationship(back_populates="verification_codes")
    
    def __repr__(self) -> str:
        return f"VerificationCodeDB(id={self.id}, email={self.email}, expires_at={self.expires_at})"