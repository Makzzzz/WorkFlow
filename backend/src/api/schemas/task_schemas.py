from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class TaskCreate(BaseModel):
    """Модель для создания задачи"""
    task_name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    deadline: Optional[datetime] = None
    is_p2p_enabled: bool = False


class TaskUpdate(BaseModel):
    """Модель для обновления задачи (все поля опциональны)"""
    task_name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    deadline: Optional[datetime] = None
    is_p2p_enabled: Optional[bool] = None


class TaskResponse(BaseModel):
    """Модель ответа с информацией о задаче"""
    id: int
    task_name: str
    description: Optional[str]
    group_id: int
    deadline: Optional[datetime]
    is_p2p_enabled: bool

    model_config = {"from_attributes": True}