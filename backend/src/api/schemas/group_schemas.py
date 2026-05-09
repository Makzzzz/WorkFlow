from pydantic import BaseModel
from typing import Optional, List
from .task_schemas import TaskResponse
from backend.src.infrastructure.dbEntities.user_status_enum import UserStatus


class UserResponse(BaseModel):
    """Модель пользователя для ответа (краткая информация)"""
    id: int
    first_name: str
    second_name: str
    email: str


class GroupCreate(BaseModel):
    """Модель для создания группы"""
    group_name: str
    description: Optional[str] = None


class GroupResponse(BaseModel):
    """Модель ответа при создании / получении списка групп"""
    id: int
    group_name: str
    description: Optional[str]


class GroupDetailResponse(GroupResponse):
    """Модель информации о группе (с участниками и задачами)"""
    members: List[UserResponse]
    tasks: List[TaskResponse]
    user_status: UserStatus


class AddMember(BaseModel):
    """Модель для добавления участника в группу"""
    user_id: int


class InviteLinkResponse(BaseModel):
    """Модель ответа при генерации ссылки-приглашения"""
    invite_link: str
    expires_at: Optional[str] = None