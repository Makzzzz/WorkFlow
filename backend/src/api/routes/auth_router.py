import time
from _pyrepl.commands import refresh
from datetime import datetime, timezone, timedelta

import jwt

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db_session
from backend.src.infrastructure.dbEntities.user import User
from backend.src.infrastructure.dbEntities.refresh_token import RefreshToken

from backend.src.infrastructure.repositories.user_repo import UserRepo
from backend.src.services.auth.password_services import PasswordService
from backend.src.services.auth.verification_code import VerificationCode, PendingRegistration
from backend.src.services.auth.user_services import UserService
from backend.src.services.auth.token_services import TokenService
from backend.src.services.auth.email_services import EmailService
from backend.src.api.schemas.user_schemas import (
    UserResponseModel, UserRegisterModel, TokenPairModel,
    RefreshTokenModel, EmailVerificationModel, PasswordResetRequest,
    PasswordResetConfirm, UserUpdate
)
from backend.src.services.auth.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

class ConfirmCode(BaseModel):
    code: str
    email: str

@router.post("/register", response_model=UserResponseModel)
async def register(
        user_data: UserRegisterModel,
        session: AsyncSession = Depends(get_db_session)
):
    email = user_data.email.lower()
    user_repo = UserRepo(session)
    if await user_repo.get_user_by_email(email):
        raise HTTPException(status_code=400, detail="Email уже зарегистрирован")
    if VerificationCode.get(email):
        raise HTTPException(status_code=400, detail="Ожидает подтвеждения")

    hashed_password = PasswordService.hash_password(user_data.password)
    code = EmailService.generate_verification_code()

    VerificationCode.save(email, PendingRegistration(
        email=email,
        hashed_password=hashed_password,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        code=code,
        expires_at=time.time() + 300
    ))

    email_service = EmailService(user_repo=user_repo)
    await email_service.send_verification_code_to_email(email, code)
    return {"message:" f"Код отправлен на {email}"}

@router.post("/confirm", status_code=status.HTTP_201_CREATED)
async def confirm_registration(data: ConfirmCode, session: AsyncSession = Depends(get_db_session)):
    email = data.email.lower()
    pending = VerificationCode.get(email)

    if not pending:
        raise HTTPException(status_code=400, detail="Нет активной регистрации")
    if time.time() > pending.expires_at:
        VerificationCode.delete(email)
        raise HTTPException(status_code=400, detail="Код истёк")
    if pending.code != data.code.upper():
        raise HTTPException(status_code=400, detail="Неверный код")

    new_user = User(
        email=pending.email,
        first_name=pending.first_name,
        last_name=pending.last_name,
        password=pending.hashed_password,
    )

    session.add(new_user)
    await session.flush()
    await session.refresh(new_user)

    VerificationCode.delete(email)

    return {
        "message": "Аккаунта успешно создан",
        "user_id": new_user.id,
        "email": new_user.email,
    }


@router.post("/login", response_model=TokenPairModel)
async def login(
        form: OAuth2PasswordRequestForm = Depends(),
        session: AsyncSession = Depends(get_db_session)
):
    user_service = UserService(session)
    token_service = TokenService()

    user = await user_service.authenticate_user(form.username, form.password)

    access = token_service.create_access_token({"sub": user.email})
    refresh = token_service.create_refresh_token({"sub": user.email})
    hashed_refresh = token_service.hash_refresh_token(refresh)

    new_rt = RefreshToken(
        user_id=user.id,
        token=hashed_refresh,
        expires_at=datetime.now(timezone.utc) + timedelta(dats=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    )
    session.add(new_rt)
    return {"access_token": access, "refresh_token": refresh, "token_type": "bearer"}

@router.post("/refresh", response_model=TokenPairModel)
async def refresh_token(
        data: RefreshTokenModel,
        session: AsyncSession = Depends(get_db_session)
):
    token_service = TokenService()
    user_repo = UserRepo(session)

    try:
        payload = jwt.decode(
            data.refresh_token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        email = payload.get("sub")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    user = await user_repo.get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    hashed_refresh = token_service.hash_refresh_token(data.refresh_token)
    stmt = select(RefreshToken).where(
        RefreshToken.user_id == user.id,
        RefreshToken.token == hashed_refresh
    )
    result = await session.execute(stmt)
    db_token = result.scalars().first()

    if not db_token:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    if  db_token.expire_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    await session.delete(db_token)

    new_access_token = token_service.create_access_token({"sub": user.email})
    new_refresh_token = token_service.create_refresh_token({"sub": user.email})
    hashed_refresh = token_service.hash_refresh_token(new_refresh_token)

    new_rt = RefreshToken(
        user_id=user.id,
        token=hashed_refresh,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    )
    session.add(new_rt)

    return {"access_token": new_access_token, "refresh_token": new_refresh_token}

@router.post("/forgot_password")
async def forgot_password(data: PasswordResetConfirm, session: AsyncSession = Depends(get_db_session)):
    user_repo = UserRepo(session)
    password_service = PasswordService(user_repo)
    try:
        await password_service.verify_password_reset_code(data.email, data.code, data.new_password)
        return {"message": "Пароль успешно изменён"}
    except ValueError as e:
        await session.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/reset_password")
async def reset_password(data: PasswordResetConfirm):
    try:
        await PasswordService.verify_password_reset_code(data.email, data.code, data.new_password)
        return {"message": "Password changed successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/verify-email")
async def verify_email(data: EmailVerificationModel):
    success = await EmailService.verify_email_code(data.email, data.code)
    if not success:
        raise HTTPException(status_code=400, detail="Invalid or expired code")
    return {"message": "Email verified successfully"}
