import secrets
from typing import Annotated, Optional
from pwdlib import PasswordHash
import jwt
from jwt.exceptions import InvalidTokenError
from config import settings
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from datetime import datetime, timedelta, timezone
from temporary_storage_db import storage, UserStorage, verification_code
from base_models import UserRegisterModel
import smtplib
from email.message import EmailMessage

hash_protocol = PasswordHash.recommended()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Password func-s
def get_hashed_password(password):
    return hash_protocol.hash(password)

def verify_password(plain_password, hashed_password):
    try:
        return hash_protocol.verify(plain_password, hashed_password)
    except Exception:
        return False

# Token func-s
def create_access_token(data: dict, expire_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
            expire_delta or timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, settings.JWT_ALGORITHM)

def create_refresh_token(data:dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, settings.JWT_ALGORITHM)

def hash_refresh_token(token: str) -> str:
    return hash_protocol.hash(token)

def verify_refresh_token(token: str, hashed_token: str) -> bool:
    try:
        return hash_protocol.verify(token, hashed_token)
    except Exception:
        return False

# Email func-s
def generate_verification_code() -> str:
    return secrets.token_hex(3).upper()

def send_verification_code_to_email(email: str, code: str):
    """
    пока заглушка
    """

    print(f"To: {email}")
    print(f"Code: {code}")

def verify_email_code(email: str, ver_code: str) -> bool:
    if not verification_code.verify_and_delete(email, ver_code):
        return False

    storage.update_user(email, {"is_active": True})
    return True

# User func-s
def get_user_by_email(email: str) -> Optional[UserStorage]:
    return storage.get_by_email(email)

def create_user(user: UserRegisterModel) -> UserStorage:
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
    send_verification_code_to_email(user.email, ver_code)
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