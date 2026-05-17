import asyncio
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jwt import InvalidTokenError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.src.api.schemas.user_schemas import UserRegisterModel
from backend.src.services.auth.config import settings
from backend.src.services.auth.email_services import EmailService
from backend.src.services.auth.password_services import PasswordService
from backend.src.infrastructure.dbEntities.user import User
from backend.src.infrastructure.repositories.user_repo import UserRepo
from backend.src.services.auth.verification_code import VerificationCode

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")

class UserService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = UserRepo(session)
    async def get_user_by_email(self, email: str) -> User | None:
        return await self.repo.get_user_by_email(email)

    async def get_user_by_id(self, user_id: int) -> User | None:
        return await self.repo.get_user_by_id(user_id)

    async def create_user(self, user_data: UserRegisterModel) -> User:
        if await self.get_user_by_email(user_data.email):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

        new_user = await self.repo.add_user(
            email=user_data.email,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            password_hash=PasswordService.hash_password(user_data.password),
        )

        self.session.add(new_user)
        await self.session.refresh(new_user)

        ver_code = EmailService.generate_verification_code()
        VerificationCode.save(new_user.email, ver_code, ttl_minutes=5)
        asyncio.create_task(EmailService.send_verification_code_to_email(new_user.email, ver_code))
        return new_user

    async def authenticate_user(self, email: str, password: str) -> User:
        user = await self.get_user_by_email(email)
        if not user or not PasswordService.verify_password(password, user.password):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")

        if not getattr(user, "is_verified", False):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Email not verified. Check your inbox.")

        return user

    async def get_current_user(self, token: Annotated[str, Depends(oauth2_scheme)]) -> User:
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        try:
            payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
            email: str = payload.get("sub")
            if email is None or payload.get("type") != "access":
                raise credentials_exception
        except InvalidTokenError:
            raise credentials_exception
        user = await self.get_user_by_email(email)
        if user is None:
            raise credentials_exception
        return user