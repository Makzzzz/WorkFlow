from pydantic import BaseModel
from typing import Optional, List
from .task import TaskResponse

class UserResponse(BaseModel):
    """Модель пользователя для ответа (краткая информация)"""
    id: int
    first_name: str
    second_name: str
    email: str

class TeamCreate(BaseModel):
    """Модель для создания команды"""
    team_name: str
    description: Optional[str] = None

class TeamResponse(BaseModel):
    """Модель ответа при создании / получении списка команд"""
    id: int
    team_name: str
    description: Optional[str]

class TeamDetailResponse(TeamResponse):
    """Модель информации о команде (с участниками и задачами)"""
    members: List[UserResponse]
    tasks: List[TaskResponse]
    is_owner: bool

class AddMember(BaseModel):
    """Модель для добавления участника в команду"""
    user_id: int

class InviteLinkResponse(BaseModel):
    """Модель ответа при генерации ссылки-приглашения"""
    invite_link: str
    expires_at: Optional[str] = None