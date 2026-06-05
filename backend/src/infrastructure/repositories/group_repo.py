from typing import Sequence
from uuid import uuid4

from sqlalchemy import select, delete, update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.src.infrastructure.dbEntities.group import Group
from backend.src.infrastructure.dbEntities.task import Task
from backend.src.infrastructure.dbEntities.user import User
from backend.src.infrastructure.dbEntities.user_group import UserGroup
from backend.src.api.schemas import GroupCreate, GroupUpdate
from backend.src.infrastructure.dbEntities.user_status_enum import UserStatus


class GroupRepo:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_group(self, group: GroupCreate, owner_id: int) -> Group:
        group = Group(
            group_name=group.group_name,
            description=group.description,
            invite_token=str(uuid4())
        )

        self.session.add(group)
        await self.session.flush()

        group_owner = UserGroup(
            user_id=owner_id,
            group_id=group.id,
            user_status=UserStatus.EXPERT
        )
        self.session.add(group_owner)

        return group

    async def get_group_by_id(self, group_id: int) -> Group | None:
        return await self.session.get(Group, group_id)

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
        user_group_stmt = delete(UserGroup).where(UserGroup.group_id == group_id)
        await self.session.execute(user_group_stmt)
        
        task_stmt = delete(Task).where(Task.group_id == group_id)
        await self.session.execute(task_stmt)
        
        stmt = delete(Group).where(Group.id == group_id)
        result = await self.session.execute(stmt)
        return result.rowcount > 0

    async def update_team(self, group_id: int, new_team: GroupUpdate) -> Group | None:
        update_dict = new_team.model_dump(exclude_unset=True)

        if not update_dict:
            return await self.get_group_by_id(group_id)

        stmt = update(Group).where(Group.id == group_id).values(**update_dict)
        result = await self.session.execute(stmt)

        if result.rowcount == 0:
            return None

        return await self.get_group_by_id(group_id)

    async def check_user_is_expert(self, group_id: int, user_id: int) -> bool:
        stmt = select(UserGroup).where(
            (UserGroup.group_id == group_id) &
            (UserGroup.user_id == user_id) &
            (UserGroup.user_status == UserStatus.EXPERT)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none() is not None

    async def check_user_is_member(self, group_id: int, user_id: int) -> bool:
        stmt = select(UserGroup).where(
            (UserGroup.group_id == group_id) &
            (UserGroup.user_id == user_id)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none() is not None