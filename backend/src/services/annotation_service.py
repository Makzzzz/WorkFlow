from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.src.infrastructure.repositories.annotation_repo import AnnotationRepo
from backend.src.infrastructure.repositories.solution_repo import SolutionRepo
from backend.src.infrastructure.repositories.task_repo import TaskRepo
from backend.src.infrastructure.repositories.group_repo import GroupRepo
from backend.src.api.schemas.annotation_schemas import AnnotationData
from backend.src.infrastructure.dbEntities.annotation import Annotation
from backend.src.infrastructure.dbEntities.solution import Solution


class AnnotationService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.annotation_repo = AnnotationRepo(session)
        self.solution_repo = SolutionRepo(session)
        self.task_repo = TaskRepo(session)
        self.group_repo = GroupRepo(session)

    async def _get_solution_for_member(self, solution_id: int, user_id: int) -> Solution:
        solution = await self.solution_repo.get_solution_detail(solution_id)
        if not solution:
            raise HTTPException(status_code=404, detail="Solution not found")

        task = await self.task_repo.get_task_by_id(solution.task_id)
        if not task or not await self.group_repo.check_user_is_member(task.group_id, user_id):
            raise HTTPException(status_code=403, detail="You are not a member of this task's group")

        return solution

    async def get_annotation(self, solution_id: int, file_key: str, user_id: int) -> Annotation | None:
        await self._get_solution_for_member(solution_id, user_id)
        return await self.annotation_repo.get_by_solution_and_file(solution_id, file_key)

    async def save_annotation(self, solution_id: int, file_key: str, data: AnnotationData, user_id: int) -> Annotation:
        solution = await self._get_solution_for_member(solution_id, user_id)

        if solution.student_id == user_id:
            raise HTTPException(status_code=403, detail="Нельзя редактировать пометки на собственной работе")

        return await self.annotation_repo.upsert(solution_id, file_key, data, user_id)
