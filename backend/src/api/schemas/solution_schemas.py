from pydantic import BaseModel
from datetime import datetime
from backend.src.infrastructure.dbEntities.solution_status_enum import SolutionStatus

class SolutionCreate(BaseModel):
    """Модель для отправки решения"""
    file_path: str

class SolutionResponse(BaseModel):
    """Модель ответа с информацией о решении"""
    id: int
    student_id: int
    task_id: int
    status: SolutionStatus
    file_path: str
    uploaded_at: datetime

class SolutionUpdate(BaseModel):
    """Модель для обновления решения (новая ссылка)"""
    file_path: str