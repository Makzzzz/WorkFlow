from typing import Sequence

from sqlalchemy import select, delete, update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.src.api.schemas import SolutionCreate, SolutionUpdate
from backend.src.infrastructure.dbEntities.solution import Solution


class SolutionRepo:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_solution(self, solution_data: SolutionCreate, user_id: int, current_task_id: int) -> Solution:
        solution = Solution(
            student_id=user_id,
            task_id=current_task_id,
            file_path=solution_data.file_path
        )

        self.session.add(solution)
        await self.session.flush()

        return solution

    async def get_own_solution(self, current_task_id: int, current_user_id: int) -> Solution | None:
        stmt = (
            select(Solution)
            .where((Solution.task_id == current_task_id)
                   & (Solution.student_id == current_user_id))
        )
        result = await self.session.execute(stmt)

        return result.scalars().first()

    async def get_task_solutions(self, current_task_id: int) -> Sequence[Solution]:
        stmt = (
            select(Solution)
            .where(Solution.task_id == current_task_id)
        )
        result = await self.session.execute(stmt)

        return result.scalars().all()

    async def get_solution_detail(self, solution_id: int) -> Solution | None:
        stmt = (
            select(Solution)
            .where(Solution.id == solution_id)
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def delete_solution(self, solution_id: int) -> bool:
        stmt = (
            delete(Solution)
            .where(Solution.id == solution_id)
        )
        result = await self.session.execute(stmt)
        return result.rowcount > 0

    async def update_solution(self, solution_id: int, updated_solution: SolutionUpdate) -> Solution | None:
        updated_sol = updated_solution.model_dump(exclude_unset=True)
        if not updated_sol:
            return await self.get_solution_detail(solution_id)

        stmt = (
            update(Solution)
            .where(Solution.id == solution_id)
            .values(**updated_sol)
        )
        result = await self.session.execute(stmt)

        if result.rowcount == 0:
            return None

        return await self.get_solution_detail(solution_id)
