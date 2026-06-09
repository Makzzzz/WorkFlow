from typing import Optional, List

from pydantic import BaseModel, Field, EmailStr

from backend.src.infrastructure.dbEntities.user_status_enum import UserStatus
from .task_schemas import TaskResponse


class UserResponse(BaseModel):
    """Модель пользователя для ответа (краткая информация)"""
    id: int
    first_name: str
    last_name: str | None
    email: EmailStr

    model_config = {"from_attributes": True}


class GroupCreate(BaseModel):
    """Модель для создания группы"""
    group_name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)


class GroupResponse(BaseModel):
    """Модель ответа при создании / получении списка групп"""
    id: int
    group_name: str
    description: Optional[str]
    invite_token: str

    model_config = {"from_attributes": True}


class GroupDetailResponse(GroupResponse):
    """Модель информации о группе (с участниками и задачами)"""
    members: List[UserResponse]
    organizer: Optional[UserResponse] = None
    tasks: List[TaskResponse]
    user_status: UserStatus


class JoinGroupRequest(BaseModel):
    """Модель для вступления в группу по инвайт-токену"""
    invite_token: str = Field(..., min_length=36, max_length=36)


class GroupUpdate(BaseModel):
    """Модель для обновления группы (все поля опциональны)"""
    group_name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
