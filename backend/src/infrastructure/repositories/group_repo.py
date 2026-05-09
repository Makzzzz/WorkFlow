from typing import Sequence

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from backend.src.infrastructure.dbEntities.group import Group
from backend.src.infrastructure.dbEntities.task import Task
from backend.src.infrastructure.dbEntities.user import User
from backend.src.infrastructure.dbEntities.user_group import UserGroup
from backend.src.api.schemas import GroupCreate


class GroupRepo:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_group(self, group: GroupCreate) -> Group: # мне по сути здесь еще нужен user_id
        group = Group(
            group_name=group.team_name,
            description=group.description
        )

        self.session.add(group)
        await self.session.flush()
        return group

    async def get_user_groups(self, user_id: int) -> Sequence[Group]:
        stmt = (
            select(Group)
            .join(UserGroup, Group.id == UserGroup.group_id)
            .where(UserGroup.user_id == user_id)
        )

        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_team_detail(self, group_id: int) -> dict | None:
        group = await self.session.get(Group, group_id)
        if not group:
            return None

        group_members_stmt = (
            select(User, UserGroup.user_status)
            .join(UserGroup, User.id == UserGroup.user_id)
            .where(UserGroup.group_id == group_id)
        )
        members_result = await self.session.execute(group_members_stmt)
        members = members_result.all()

        group_tasks_stmt = (
            select(Task)
            .where(Task.group_id == group_id)
            .order_by(Task.id.desc())
        )
        task_result = await self.session.execute(group_tasks_stmt)
        tasks = task_result.scalars().all()

        return {
            "group": group,
            "members": members,
            "tasks": tasks
        }

    async def delete_team(self, group_id: int) -> bool:
        stmt = delete(Group).where(Group.id == group_id)
        result = await self.session.execute(stmt)
        return result.rowcount > 0

    async def update_team(self, group_id: int, new_team: GroupCreate ) -> Group | None:
        pass # нет модели для обновления данных группы


