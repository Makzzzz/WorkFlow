from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Sequence, Optional

from backend.src.infrastructure.dbEntities.solution_status_enum import SolutionStatus
from backend.src.infrastructure.repositories.feedback_repo import FeedbackRepo
from backend.src.infrastructure.repositories.solution_repo import SolutionRepo
from backend.src.api.schemas.feedback_schemas import (FeedbackCreate, FeedbackResponse, FeedbackForCriteriaResponse)
from backend.src.infrastructure.dbEntities.feedback import Feedback
from backend.src.infrastructure.dbEntities.feedback_for_criteria import FeedbackForCriteria


class FeedbackService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.feedback_repo = FeedbackRepo(session)
        self.solution_repo = SolutionRepo(session)

    async def create_feedback(self, solution_id: int, feedback_data: FeedbackCreate, user_id: int) -> Feedback:
        """Создать фидбек на решение. Проверяет существование решения перед созданием."""
        solution = await self.solution_repo.get_solution_detail(solution_id)
        if not solution:
            raise HTTPException(status_code=404, detail="Solution not found")
        feedback = await self.feedback_repo.create_feedback(feedback_data, solution_id, user_id)
        await self.solution_repo.update_solution_status(solution_id, SolutionStatus.CHECKED)
        await self._attach_criteria_feedback(feedback)
        return feedback

    async def _attach_criteria_feedback(self, feedback: Feedback) -> None:
        """Подгружает комментарии по критериям для ответа (имя поля ORM-связи не совпадает со схемой)."""
        criteria_feedback = await self.feedback_repo.get_feedback_criteria(feedback.id)
        feedback.criteria_feedback = [
            {
                "id": cf.id,
                "criteria_id": cf.criteria_id,
                "criteria_name": cf.criteria.criteria_name,
                "comment": cf.comment or ""
            }
            for cf in criteria_feedback
        ]

    async def get_feedback_by_solution(self, solution_id: int, user_id: int) -> Feedback:
        """Получить фидбек по ID решения. Выбрасывает исключение, если фидбека нет."""
        feedback = await self.feedback_repo.get_feedback_by_solution(solution_id)
        if not feedback:
            raise HTTPException(status_code=404, detail="Feedback not found")
        await self._attach_criteria_feedback(feedback)
        return feedback

    async def update_feedback(self, feedback_id: int, feedback_data: FeedbackCreate, user_id: int) -> Feedback:
        """Обновить существующий фидбек. Полная замена оценки, комментария и критериев."""
        existing_feedback = await self.feedback_repo.get_feedback_by_id(feedback_id)
        if not existing_feedback:
            raise HTTPException(status_code=404, detail="Feedback not found")
        feedback = await self.feedback_repo.update_feedback(feedback_id, feedback_data)
        await self._attach_criteria_feedback(feedback)
        return feedback

    async def get_feedback_criteria(self, feedback_id: int, user_id: int) -> Sequence[FeedbackForCriteria]:
        """Получить список комментариев по критериям для конкретного фидбека."""
        if not await self.feedback_repo.get_feedback_by_id(feedback_id):
            raise HTTPException(status_code=404, detail="Feedback not found")
        return await self.feedback_repo.get_feedback_criteria(feedback_id)