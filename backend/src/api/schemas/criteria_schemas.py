from pydantic import BaseModel, Field
from typing import Optional


class CriteriaCreate(BaseModel):
    """Модель для создания критерия оценки"""
    criteria_name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)


class CriteriaUpdate(BaseModel):
    """Модель для обновления критерия оценки"""
    criteria_name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)


class CriteriaResponse(BaseModel):
    """Модель ответа с информацией о критерии"""
    id: int
    criteria_name: str
    description: Optional[str]
    task_id: int

    model_config = {"from_attributes": True}