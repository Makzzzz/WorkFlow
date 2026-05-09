import asyncio
from typing import Optional, Annotated

import jwt
from aiosmtplib import status
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jwt import InvalidTokenError

from backend.src.models.user_model import UserRegisterModel
from backend.src.services.auth.config import settings
from backend.src.services.auth.email_services import generate_verification_code, send_verification_code_to_email
from backend.src.services.auth.password_services import get_hashed_password, verify_password
from backend.src.services.auth.temporary_storage_db import UserStorage, storage, verification_code

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def get_user_by_email(email: str) -> Optional[UserStorage]:
    return storage.get_by_email(email)

async def create_user(user: UserRegisterModel) -> UserStorage:
    if get_user_by_email(user.email):
        raise ValueError("Email already registered")

    ver_code = generate_verification_code()
    verification_code.store_code(user.email, ver_code, ttl_minutes=5)
    db_user = UserStorage(
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        password_hash=get_hashed_password(user.password),
        is_active=False,
    )
    created_user = storage.create_user(db_user)
    asyncio.create_task(send_verification_code_to_email(user.email, ver_code))
    return created_user

def authenticate_user(email:str, password:str) -> Optional[UserStorage]:
    user = get_user_by_email(email)
    if not user or not verify_password(password, user.password_hash):
        return None
    return user

async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]) -> UserStorage:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        email: str = payload.get("sub")
        if email is None or payload.get("sub") != "access":
            raise credentials_exception
    except InvalidTokenError:
        raise credentials_exception
    user = get_user_by_email(email)
    if user is None:
        raise credentials_exception
    return user