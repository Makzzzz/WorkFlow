from datetime import datetime
from typing import List
from pydantic import BaseModel, Field
from backend.src.infrastructure.dbEntities.solution_status_enum import SolutionStatus


class SolutionCreate(BaseModel):
    """Модель для отправки решения"""
    file_path: str = Field(..., min_length=1, max_length=500)


class SolutionResponse(BaseModel):
    """Модель ответа с информацией о решении"""
    id: int
    student_id: int
    task_id: int
    status: SolutionStatus
    file_path: str
    uploaded_at: datetime

    model_config = {"from_attributes": True}


class SolutionUpdate(BaseModel):
    """Модель для обновления решения (новая ссылка)"""
    file_path: str = Field(..., min_length=1, max_length=500)

class SolutionDetailResponse(BaseModel):
    id: int
    student_id: int
    task_id: int
    status: str
    uploaded_at: datetime
    file_urls: List[str]

    class Config:
        from_attributes = True