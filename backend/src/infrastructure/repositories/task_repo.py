from typing import Sequence

from sqlalchemy import select, delete, update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.src.infrastructure.dbEntities.task import Task
from backend.src.models import TaskCreate, TaskUpdate


class TaskRepo:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def add_task(self, task_data: TaskCreate, group_id: int) -> Task:
        task = Task(
            task_name=task_data.task_name,
            description=task_data.description,
            group_id=group_id,
            deadline=task_data.deadline,
            is_p2p_enabled=task_data.is_p2p_enabled
        )
        self.session.add(task)
        await self.session.flush()
        return task

    async def get_task_by_id(self, task_id: int) -> Task | None:
        stmt = select(Task).where(Task.id == task_id)
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def get_all_tasks(self, input_group_id: int) -> Sequence[Task]:
        stmt = select(Task).where(Task.group_id == input_group_id).order_by(Task.id.desc())
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def delete_task(self, task_id: int) -> bool:
        stmt = delete(Task).where(Task.id == task_id)
        result = await self.session.execute(stmt)
        return result.rowcount > 0

    async def update_task(self, updated_task: TaskUpdate, task_id: int) -> Task | None:
        update_dict = updated_task.model_dump(exclude_unset=True)

        if not update_dict:
            return await self.get_task_by_id(task_id)

        stmt = update(Task).where(Task.id == task_id).values(**update_dict)
        result = await self.session.execute(stmt)

        if result.rowcount == 0:
            return None

        return await self.get_task_by_id(task_id)
