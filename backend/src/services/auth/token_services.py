from datetime import datetime, timezone, timedelta
from typing import Optional

import jwt
from pwdlib import PasswordHash

from backend.src.services.auth.config import settings


hash_protocol = PasswordHash.recommended()

class TokenService:
    @staticmethod
    def create_access_token(data: dict, expire_delta: Optional[timedelta] = None) -> str:
        to_encode = data.copy()

        expire = datetime.now(timezone.utc) + (
                expire_delta or timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
        )

        to_encode.update({"exp": expire})
        return jwt.encode(to_encode, settings.JWT_SECRET_KEY, settings.JWT_ALGORITHM)

    @staticmethod
    def create_refresh_token(data: dict) -> str:
        to_encode = data.copy()

        expire = datetime.now(timezone.utc) + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)

        to_encode.update({"exp": expire})
        return jwt.encode(to_encode, settings.JWT_SECRET_KEY, settings.JWT_ALGORITHM)

    @staticmethod
    def hash_refresh_token(token: str) -> str:
        return hash_protocol.hash(token)

    @staticmethod
    def verify_refresh_token(token: str, hashed_token: str) -> bool:
        try:
            return hash_protocol.verify(token, hashed_token)
        except Exception:
            return False