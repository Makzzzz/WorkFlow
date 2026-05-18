from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Sequence

from backend.src.infrastructure.repositories.group_repo import GroupRepo
from backend.src.infrastructure.repositories.task_repo import TaskRepo
from backend.src.infrastructure.repositories.criteria_repo import CriteriaRepo
from backend.src.api.schemas.task_schemas import TaskCreate, TaskUpdate
from backend.src.api.schemas.criteria_schemas import CriteriaCreate, CriteriaUpdate
from backend.src.infrastructure.dbEntities.task import Task
from backend.src.infrastructure.dbEntities.criteria import Criteria
from backend.src.infrastructure.dbEntities.user_group import UserGroup
from backend.src.infrastructure.dbEntities.user_status_enum import UserStatus


class TaskService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.task_repo = TaskRepo(session)
        self.criteria_repo = CriteriaRepo(session)
        self.group_repo = GroupRepo(session)

    async def create_task(self, group_id: int, task_data: TaskCreate, user_id: int) -> Task:
        if not await self.group_repo.check_user_is_member(group_id, user_id):
            raise HTTPException(status_code=403, detail="You are not a member of this group")
        return await self.task_repo.add_task(task_data, group_id)

    async def get_group_tasks(self, group_id: int, user_id: int) -> Sequence[Task]:
        if not await self.group_repo.check_user_is_member(group_id, user_id):
            raise HTTPException(status_code=403, detail="You are not a member of this group")
        return await self.task_repo.get_all_tasks(group_id)

    async def get_task_detail(self, task_id: int, user_id: int) -> Task:
        task = await self.task_repo.get_task_by_id(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")

        if not await self.group_repo.check_user_is_member(task.group_id, user_id):
            raise HTTPException(status_code=403, detail="You are not a member of this group")

        return task

    async def update_task(self, task_id: int, task_data: TaskUpdate, user_id: int) -> Task:
        task = await self.task_repo.get_task_by_id(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")

        if not await self.group_repo.check_user_is_expert(task.group_id, user_id):
            raise HTTPException(status_code=403, detail="Only group experts can update tasks")

        updated_task = await self.task_repo.update_task(task_data, task_id)
        if not updated_task:
            raise HTTPException(status_code=404, detail="Task not found")
        return updated_task

    async def delete_task(self, task_id: int, user_id: int) -> dict:
        task = await self.task_repo.get_task_by_id(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")

        if not await self.group_repo.check_user_is_expert(task.group_id, user_id):
            raise HTTPException(status_code=403, detail="Only group experts can delete tasks")

        success = await self.task_repo.delete_task(task_id)
        if not success:
            raise HTTPException(status_code=404, detail="Task not found")
        return {"message": "Task deleted successfully"}

    async def add_criteria(self, task_id: int, criteria_data: CriteriaCreate, user_id: int) -> Criteria:
        task = await self.task_repo.get_task_by_id(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")

        if not await self.group_repo.check_user_is_expert(task.group_id, user_id):
            raise HTTPException(status_code=403, detail="Only group experts can add criteria")

        return await self.criteria_repo.create_criteria(criteria_data, task_id)

    async def get_task_criteria(self, task_id: int, user_id: int) -> Sequence[Criteria]:
        task = await self.task_repo.get_task_by_id(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")

        if not await self.group_repo.check_user_is_member(task.group_id, user_id):
            raise HTTPException(status_code=403, detail="You are not a member of this group")

        return await self.criteria_repo.get_task_criteria(task_id)

    async def update_criteria(self, criteria_id: int, criteria_data: CriteriaUpdate, user_id: int) -> Criteria:
        criteria = await self.criteria_repo.get_criteria_by_id(criteria_id)
        if not criteria:
            raise HTTPException(status_code=404, detail="Criteria not found")

        task = await self.task_repo.get_task_by_id(criteria.task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")

        if not await self.group_repo.check_user_is_expert(task.group_id, user_id):
            raise HTTPException(status_code=403, detail="Only group experts can update criteria")

        updated_criteria = await self.criteria_repo.update_criteria(criteria_id, criteria_data)
        if not updated_criteria:
            raise HTTPException(status_code=404, detail="Criteria not found")
        return updated_criteria

    async def delete_criteria(self, criteria_id: int, user_id: int) -> dict:
        criteria = await self.criteria_repo.get_criteria_by_id(criteria_id)
        if not criteria:
            raise HTTPException(status_code=404, detail="Criteria not found")

        task = await self.task_repo.get_task_by_id(criteria.task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")

        if not await self.group_repo.check_user_is_expert(task.group_id, user_id):
            raise HTTPException(status_code=403, detail="Only group experts can delete criteria")

        success = await self.criteria_repo.delete_criteria(criteria_id)
        if not success:
            raise HTTPException(status_code=404, detail="Criteria not found")
        return {"message": "Criteria deleted successfully"}
