from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class FeedbackForCriteriaCreate(BaseModel):
    """Модель для создания фидбека по одному критерию"""
    criteria_id: int = Field(..., gt=0)
    comment: str = Field(..., max_length=1000)


class FeedbackCreate(BaseModel):
    """Модель для создания полного фидбека на решение"""
    overall_comment: str = Field(..., max_length=2000)
    grade: int = Field(..., ge=0, le=100)
    criteria_feedback: List[FeedbackForCriteriaCreate] = Field(..., min_length=1)


class FeedbackResponse(BaseModel):
    """Модель ответа с информацией о фидбеке"""
    id: int
    solution_id: int
    reviewer_id: int
    overall_comment: str
    grade: int
    commented_at: datetime
    criteria_feedback: Optional[List[FeedbackForCriteriaResponse]] = None

    model_config = {"from_attributes": True}


class FeedbackForCriteriaResponse(BaseModel):
    """Модель ответа с фидбеком по одному критерию"""
    id: int
    criteria_id: int
    criteria_name: str
    comment: str

    model_config = {"from_attributes": True}