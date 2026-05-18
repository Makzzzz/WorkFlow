from collections.abc import Sequence

from sqlalchemy import select, delete, update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.src.api.schemas import CriteriaCreate, CriteriaUpdate
from backend.src.infrastructure.dbEntities.criteria import Criteria


class CriteriaRepo:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_criteria(self, criteria_data: CriteriaCreate, current_task_id: int) -> Criteria:
        criteria = Criteria(
            criteria_name=criteria_data.criteria_name,
            description=criteria_data.description,
            task_id=current_task_id,
        )
        self.session.add(criteria)
        await self.session.flush()
        return criteria

    async def get_criteria_by_id(self, criteria_id: int) -> Criteria | None:
        return await self.session.get(Criteria, criteria_id)

    async def get_task_criteria(self, task_id: int) -> Sequence[Criteria]:
        stmt = (
            select(Criteria)
            .where(Criteria.task_id == task_id)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def delete_criteria(self, criteria_id: int) -> bool:
        stmt = delete(Criteria).where(Criteria.id == criteria_id)
        result = await self.session.execute(stmt)
        return result.rowcount > 0

    async def update_criteria(self, criteria_id: int, new_data: CriteriaUpdate) -> Criteria | None:
        update_data = new_data.model_dump(exclude_unset=True)
        if not update_data:
            return await self.get_criteria_by_id(criteria_id)

        stmt = update(Criteria).where(Criteria.id == criteria_id).values(**update_data)
        result = await self.session.execute(stmt)

        if result.rowcount == 0:
            return None

        return await self.get_criteria_by_id(criteria_id)
