from pydantic import BaseModel
from typing import List
from datetime import datetime

class FeedbackForCriteriaCreate(BaseModel):
    """Модель для создания фидбека по одному критерию"""
    criteria_id: int
    comment: str

class FeedbackCreate(BaseModel):
    """Модель для создания полного фидбека на решение"""
    overall_comment: str
    grade: int
    criteria_feedback: List[FeedbackForCriteriaCreate]

class FeedbackResponse(BaseModel):
    """Модель ответа с информацией о фидбеке"""
    id: int
    solution_id: int
    reviewer_id: int
    overall_comment: str
    grade: int
    commented_at: datetime

class FeedbackForCriteriaResponse(BaseModel):
    """Модель ответа с фидбеком по одному критерию"""
    id: int
    criteria_id: int
    criteria_name: str
    comment: str