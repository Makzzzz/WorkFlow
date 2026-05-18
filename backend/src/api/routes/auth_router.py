import time
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
from backend.src.infrastructure.repositories.verification_code_repo import VerificationCodeRepo
from backend.src.services.auth.password_services import PasswordService
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
    
    # Check if there's a pending verification code in database
    verification_repo = VerificationCodeRepo(session)
    pending = await verification_repo.get_valid_by_email(email)
    if pending:
        raise HTTPException(status_code=400, detail="Ожидает подтвеждения")

    hashed_password = PasswordService.hash_password(user_data.password)
    code = EmailService.generate_verification_code()

    # Create user with is_active=False (will be activated after email confirmation)
    new_user = User(
        email=email,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        password=hashed_password,
        is_active=False  # User is not active until email is confirmed
    )
    
    session.add(new_user)
    await session.flush()
    await session.refresh(new_user)

    # Save verification code for email confirmation in database
    expires_at = datetime.now() + timedelta(minutes=5)
    await verification_repo.save(
        email=email,
        code=code,
        user_id=new_user.id,
        expires_at=expires_at
    )

    # Send verification email
    email_service = EmailService(user_repo=user_repo)
    await email_service.send_verification_code_to_email(email, code)
    
    # Return the created user (with is_active=False)
    return new_user

@router.post("/confirm", status_code=status.HTTP_201_CREATED)
async def confirm_registration(data: ConfirmCode, session: AsyncSession = Depends(get_db_session)):
    email = data.email.lower()
    verification_repo = VerificationCodeRepo(session)
    
    # Verify the code
    is_valid = await verification_repo.verify_and_delete(email, data.code.upper())
    if not is_valid:
        raise HTTPException(status_code=400, detail="Неверный код или код истёк")

    # Get the existing user (created during registration)
    user_repo = UserRepo(session)
    user = await user_repo.get_user_by_email(email)
    
    if not user:
        raise HTTPException(status_code=400, detail="Пользователь не найден")
    
    # Activate the user
    user.is_active = True
    await session.commit()
    await session.refresh(user)

    return {
        "message": "Аккаунт успешно активирован",
        "user_id": user.id,
        "email": user.email,
        "is_active": user.is_active
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
    refresh = token_service.create_refresh_token({"sub": user.email, "type": "refresh"})
    hashed_refresh = token_service.hash_refresh_token(refresh)

    new_rt = RefreshToken(
        user_id=user.id,
        token=hashed_refresh,
        expire_at=datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    )
    session.add(new_rt)
    await session.commit()
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

    # Get all refresh tokens for this user
    stmt = select(RefreshToken).where(
        RefreshToken.user_id == user.id
    )
    result = await session.execute(stmt)
    db_tokens = result.scalars().all()
    
    # Find the matching token using verification
    db_token = None
    for token in db_tokens:
        if token_service.verify_refresh_token(data.refresh_token, token.token):
            db_token = token
            break

    if not db_token:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    if db_token.expire_at < datetime.now(timezone.utc).replace(tzinfo=None):
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    await session.delete(db_token)
    await session.commit()

    new_access_token = token_service.create_access_token({"sub": user.email})
    new_refresh_token = token_service.create_refresh_token({"sub": user.email, "type": "refresh"})
    hashed_refresh = token_service.hash_refresh_token(new_refresh_token)

    new_rt = RefreshToken(
        user_id=user.id,
        token=hashed_refresh,
        expire_at=datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    )
    session.add(new_rt)
    await session.commit()

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


@router.get("/test/get_verification_code")
async def get_verification_code_for_test(email: str, session: AsyncSession = Depends(get_db_session)):
    """
    Test endpoint to get verification code for testing purposes.
    This endpoint should only be available in development/test environments.
    """
    from backend.src.infrastructure.repositories.verification_code_repo import VerificationCodeRepo
    
    repo = VerificationCodeRepo(session)
    record = await repo.get_valid_by_email(email)
    
    if not record:
        raise HTTPException(status_code=404, detail="No verification code found for this email")
    
    return {
        "email": email,
        "code": record.code,
        "expires_at": record.expires_at.isoformat() if record.expires_at else None
    }
