from typing import Sequence

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from backend.src.infrastructure.dbEntities.task import Task


class TaskRepo:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def add_task(self, task: Task) -> Task | None:
        task = Task(
            task_name=task.task_name,
            description=task.description,
            group=task.group,
            deadline=task.deadline,
            if_p2p_enabled=task.if_p2p_enabled,
        )
        self.session.add(task)
        return task

    async def get_tasks(self, input_group_id: int) -> Sequence[Task]:
        stmt = select(Task).where(Task.group_id == input_group_id)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def delete_task(self, task_id: int) -> bool:
        task = delete(Task).where(Task.id == task_id)
        result = await self.session.execute(task)
        return result.rowcount > 0

    async def update_task(self, updated_task: Task) -> bool:
        task = Task(
            task_name=updated_task.task_name,
            description=updated_task.description,
            group_id=updated_task.group_id,
            deadline=updated_task.deadline,
            if_p2p_enabled=updated_task.if_p2p_enabled,
        )
        stmt = self.session.execute(update())
        result = await self.session.update(task)
        return result.rowcount > 0
