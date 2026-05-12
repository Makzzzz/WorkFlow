from typing import Any, Sequence

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.src.api.schemas import FeedbackCreate
from backend.src.infrastructure.dbEntities.feedback import Feedback
from backend.src.infrastructure.dbEntities.feedback_for_criteria import FeedbackForCriteria


class FeedbackRepo:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_feedback(self, feedback_data: FeedbackCreate, current_solution_id: int, user_id: int) -> Feedback:
        feedback = Feedback(
            solution_id=current_solution_id,
            reviewer_id=user_id,
            overall_comment=feedback_data.overall_comment,
            grade=feedback_data.grade,
        )
        self.session.add(feedback)
        await self.session.flush()

        for item in feedback_data.criteria_feedback:
            criteria_feedback = FeedbackForCriteria(
                feedback_id=feedback.id,
                criteria_id=item.criteria_id,
                comment=item.comment
            )
            self.session.add(criteria_feedback)

        return feedback

    async def get_feedback_by_solution(self, solution_id: int) -> Feedback | None:
        stmt = (
            select(Feedback)
            .join(Feedback.feedbacks_id, isouter=True)
            .where(Feedback.solution_id == solution_id)
        )
        result = await self.session.execute(stmt)
        return result.scalars().unique().first()

    async def delete_feedback(self, feedback_id: int) -> bool:
        stmt = delete(Feedback).where(Feedback.id == feedback_id)
        result = await self.session.execute(stmt)
        return result.rowcount > 0

    async def get_feedback_criteria(self, feedback_id: int) -> Sequence[FeedbackForCriteria]:
        stmt = (
            select(FeedbackForCriteria)
            .where(FeedbackForCriteria.feedback_id == feedback_id)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def update_feedback(self, feedback_id: int, feedback_data: FeedbackCreate) -> Feedback:
        pass
