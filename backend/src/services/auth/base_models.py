from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class UserRegisterModel(BaseModel):
    email: EmailStr
    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    password: str = Field(..., min_length=6)

class UserResponseModel(BaseModel):
    id: int
    email: EmailStr
    first_name: str
    last_name: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}

class TokenPairModel(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class RefreshTokenModel(BaseModel):
    refresh_token: str
    expired_at: int

class EmailVerificationModel(BaseModel):
    email: EmailStr
    code: str
