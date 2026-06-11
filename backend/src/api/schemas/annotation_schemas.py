from datetime import datetime
from typing import List
from pydantic import BaseModel, Field


class AnnotationData(BaseModel):
    """Содержимое пометок на изображении (выделения, рисунки)"""
    strokes: List[dict] = Field(default_factory=list)


class AnnotationSave(BaseModel):
    """Модель для сохранения пометок на конкретном файле решения"""
    file_key: str = Field(..., min_length=1, max_length=500)
    data: AnnotationData


class AnnotationResponse(BaseModel):
    """Модель ответа с сохранёнными пометками"""
    id: int
    solution_id: int
    file_key: str
    data: AnnotationData
    updated_at: datetime

    model_config = {"from_attributes": True}
