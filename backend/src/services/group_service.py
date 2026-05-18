from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Sequence
from sqlalchemy import select

from backend.src.infrastructure.repositories.group_repo import GroupRepo
from backend.src.infrastructure.repositories.user_group_repo import UserGroupRepo
from backend.src.api.schemas.group_schemas import GroupCreate, GroupUpdate, JoinGroupRequest
from backend.src.infrastructure.dbEntities.user_status_enum import UserStatus
from backend.src.infrastructure.dbEntities.group import Group
from backend.src.infrastructure.dbEntities.user_group import UserGroup


class GroupService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.group_repo = GroupRepo(session)
        self.user_group_repo = UserGroupRepo(session)

    async def create_group(self, group_data: GroupCreate, user_id: int) -> Group:
        return await self.group_repo.create_group(group_data, user_id)

    async def get_user_groups(self, user_id: int) -> Sequence[Group]:
        return await self.group_repo.get_user_groups(user_id)
    
    async def get_group_detail(self, group_id: int, user_id: int) -> dict:
        if not await self.group_repo.check_user_is_member(group_id, user_id):
            raise HTTPException(status_code=403, detail="You are not a member of this group")
        
        raw = await self.group_repo.get_team_detail(group_id)
        if not raw:
            raise HTTPException(status_code=404, detail="Group not found")

        current_status = next((s for u, s in raw["members"] if u.id == user_id), UserStatus.STUDENT)

        return {
            "id": raw["group"].id,
            "group_name": raw["group"].group_name,
            "description": raw["group"].description,
            "members": [{"id": u.id, "first_name": u.first_name, "last_name": u.last_name, "email": u.email} for u, _ in raw["members"]],
            "tasks": [{"id": t.id, "task_name": t.task_name, "description": t.description, "group_id": t.group_id, "deadline": t.deadline, "is_p2p_enabled": t.is_p2p_enabled} for t in raw["tasks"]],
            "user_status": current_status
        }
    
    async def update_group(self, group_id: int, group_data: GroupUpdate, user_id: int) -> Group:
        if not await self.group_repo.check_user_is_expert(group_id, user_id):
            raise HTTPException(status_code=403, detail="Only group owner (EXPERT) can update the group")
        
        updated_group = await self.group_repo.update_team(group_id, group_data)
        if not updated_group:
            raise HTTPException(status_code=404, detail="Group not found")
        return updated_group
    
    async def delete_group(self, group_id: int, user_id: int) -> dict:
        if not await self.group_repo.check_user_is_expert(group_id, user_id):
            raise HTTPException(status_code=403, detail="Only group owner (EXPERT) can delete the group")
        
        success = await self.group_repo.delete_team(group_id)
        if not success:
            raise HTTPException(status_code=404, detail="Group not found")
        return {"message": "Group deleted successfully"}
    
    async def join_group(self, member_data: JoinGroupRequest, user_id: int) -> Group:
        group = await self.user_group_repo.join_group(member_data, user_id)
        if not group:
            raise HTTPException(status_code=404, detail="Group not found or invalid invite code")
        return group
    
    async def leave_group(self, group_id: int, user_id: int) -> dict:
        success = await self.user_group_repo.leave_group(group_id, user_id)
        if not success:
            raise HTTPException(status_code=400, detail="Failed to leave group")
        return {"message": "Successfully left the group"}
    
    async def remove_member(self, group_id: int, member_id: int, user_id: int) -> dict:
        success = await self.user_group_repo.remove_user_from_group(group_id, user_id, member_id)
        if not success:
            raise HTTPException(status_code=400, detail="Member not found or cannot be removed")
        return {"message": "Member removed successfully"}