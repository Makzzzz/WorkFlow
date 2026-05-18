from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from datetime import datetime

from backend.src.infrastructure.dbEntities.verification_code import VerificationCodeDB


class VerificationCodeRepo:
    """Репозиторий для работы с кодами подтверждения в базе данных."""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def save(self, email: str, code: str, user_id: Optional[int] = None, expires_at: datetime = None) -> VerificationCodeDB:
        """Сохранить код подтверждения в базе данных."""
        email_lower = email.lower()
        
        await self.delete_by_email(email_lower)
        
        db_record = VerificationCodeDB(
            email=email_lower,
            code=code,
            user_id=user_id,
            expires_at=expires_at or datetime.now()
        )
        
        self.session.add(db_record)
        await self.session.commit()
        await self.session.refresh(db_record)
        return db_record
    
    async def get_by_email(self, email: str) -> Optional[VerificationCodeDB]:
        """Получить код подтверждения по email."""
        email_lower = email.lower()
        
        stmt = select(VerificationCodeDB).where(
            VerificationCodeDB.email == email_lower
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
    
    async def get_valid_by_email(self, email: str) -> Optional[VerificationCodeDB]:
        """Получить действительный код подтверждения по email (не просроченный)."""
        email_lower = email.lower()
        
        stmt = select(VerificationCodeDB).where(
            VerificationCodeDB.email == email_lower,
            VerificationCodeDB.expires_at > datetime.now()
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
    
    async def delete_by_email(self, email: str) -> None:
        """Удалить код подтверждения по email."""
        email_lower = email.lower()
        
        stmt = delete(VerificationCodeDB).where(
            VerificationCodeDB.email == email_lower
        )
        await self.session.execute(stmt)
        await self.session.commit()
    
    async def verify_and_delete(self, email: str, code: str) -> bool:
        """Проверить код и удалить его из базы данных."""
        email_lower = email.lower()
        
        record = await self.get_valid_by_email(email_lower)
        if not record:
            return False
        
        if record.code != code.upper():
            return False
        
        await self.delete_by_email(email_lower)
        return True