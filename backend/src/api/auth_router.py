import jwt

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm

from backend.src.services.auth.password_services import request_password_reset, verify_password_reset_code
from backend.src.services.auth.email_services import verify_email_code
from backend.src.services.auth.user_services import (
    create_user, authenticate_user, get_user_by_email, )
from backend.src.services.auth.token_services import (
    create_access_token, create_refresh_token, hash_refresh_token, verify_refresh_token
)
from backend.src.models.user_model import (
    UserResponseModel, UserRegisterModel, TokenPairModel,
    RefreshTokenModel, EmailVerificationModel, PasswordResetRequest,
    PasswordResetConfirm
)
from backend.src.services.auth.temporary_storage_db import storage
from backend.src.services.auth.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponseModel)
async def register(user: UserRegisterModel):
    try:
        return await create_user(user)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/login", response_model=TokenPairModel)
def login(form: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(form.username, form.password)
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    access = create_access_token({"sub": user.email})
    refresh = create_refresh_token({"sub": user.email})
    storage.update_user(user.email, {"refresh_token_hash": hash_refresh_token(refresh)})
    return {"access_token": access, "refresh_token": refresh, "token_type": "bearer"}

@router.post("/refresh", response_model=TokenPairModel)
def refresh_token(data: RefreshTokenModel):
    try:
        payload = jwt.decode(data.refresh_token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        email = payload.get("sub")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    user = get_user_by_email(email)
    if not user or not verify_refresh_token(data.refresh_token, user.refresh_token_hash):
        raise HTTPException(status_code=400, detail="Invalid refresh token")

    new_access_token = create_access_token({"sub": user.email})
    new_refresh_token = create_refresh_token({"sub": user.email})
    storage.update_user(user.email, {"refresh_token_hash": hash_refresh_token(new_refresh_token)})
    return {"access_token": new_access_token, "refresh_token": new_refresh_token}

@router.post("/forgot_password")
async def forgot_password(request: PasswordResetRequest):
    await request_password_reset(request.email)
    return {"message": "Code has been sent by your email"}

@router.post("/reset_password")
async def reset_password(data: PasswordResetConfirm):
    try:
        verify_password_reset_code(data.email, data.code, data.new_password)
        return {"message": "Password changed successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/verify-email")
def verify_email(data: EmailVerificationModel):
    success = verify_email_code(data.email, data.code)
    if not success:
        raise HTTPException(status_code=400, detail="Invalid or expired code")
    return {"message": "Email verified successfully"}
