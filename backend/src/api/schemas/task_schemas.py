from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class TaskCreate(BaseModel):
    """Модель для создания задачи"""
    task_name: str
    description: Optional[str] = None
    deadline: Optional[datetime] = None
    is_p2p_enabled: bool = False


class TaskUpdate(BaseModel):
    """Модель для обновления задачи (все поля опциональны)"""
    task_name: Optional[str] = None
    description: Optional[str] = None
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


class CriteriaCreate(BaseModel):
    """Модель для создания критерия оценки"""
    criteria_name: str


class CriteriaResponse(BaseModel):
    """Модель ответа с информацией о критерии"""
    id: int
    criteria_name: str
    task_id: int