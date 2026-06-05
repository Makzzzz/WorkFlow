from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from backend.src.api.schemas import JoinGroupRequest
from backend.src.infrastructure.dbEntities.group import Group
from backend.src.infrastructure.dbEntities.user_group import UserGroup
from backend.src.infrastructure.dbEntities.user_status_enum import UserStatus


class UserGroupRepo:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def join_group(self, invite_group: JoinGroupRequest, user_id: int) -> Group | None:
        stmt = (
            select(Group)
            .where(
                Group.invite_token == invite_group.invite_token.strip()
            )
        )
        result = await self.session.execute(stmt)
        group = result.scalars().first()

        if not group:
            return None

        is_member_stmt = select(UserGroup.id).where(
            (UserGroup.user_id == user_id) & (UserGroup.group_id == group.id)
        )
        is_member = await self.session.execute(is_member_stmt)
        if is_member.scalar():
            return None

        member_link = UserGroup(
            user_id=user_id,
            group_id=group.id,
            user_status=UserStatus.STUDENT
        )
        self.session.add(member_link)

        return group

    async def leave_group(self, group_id: int, user_id: int) -> bool:
        stmt = (
            delete(UserGroup)
            .where((UserGroup.group_id == group_id)
                   & (UserGroup.user_id == user_id)
                   & (UserGroup.user_status == UserStatus.STUDENT))
        )
        result = await self.session.execute(stmt)
        return result.rowcount > 0

    async def remove_user_from_group(self, group_id: int, user_id: int, member_id: int) -> bool:
        owner_check = select(UserGroup.id).where(
            (UserGroup.user_id == user_id) &
            (UserGroup.group_id == group_id) &
            (UserGroup.user_status == UserStatus.EXPERT)
        )
        owner_result = await self.session.execute(owner_check)
        if not owner_result.scalars().first():
            return False

        if user_id == member_id:
            return False

        stmt = delete(UserGroup).where(
            (UserGroup.user_id == member_id) &
            (UserGroup.group_id == group_id)
        )

        result = await self.session.execute(stmt)
        return result.rowcount > 0
