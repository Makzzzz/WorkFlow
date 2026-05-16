from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

from sympy.abc import J


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings()

JWT_SECRET_KEY = settings.JWT_SECRET_KEY
JWT_ALGORITHM = settings.JWT_ALGORITHM
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES
JWT_REFRESH_TOKEN_EXPIRE_DAYS = settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS