from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db_session
from backend.src.services import GroupService
from backend.src.api.schemas.group_schemas import GroupCreate, GroupResponse, GroupDetailResponse, JoinGroupRequest, GroupUpdate
from ... import get_current_user_id

router = APIRouter(prefix="/groups", tags=["groups"])

def get_group_service(session: AsyncSession = Depends(get_db_session)) -> GroupService:
    return GroupService(session)


@router.post("/create", response_model=GroupResponse)
async def create_group(
        group_data: GroupCreate,
        group_service: GroupService = Depends(get_group_service),
        user_id: int = Depends(get_current_user_id)
):
    """Создать новую группу"""
    return await group_service.create_group(group_data, user_id)


@router.get("/my", response_model=list[GroupResponse])
async def get_my_groups(
        group_service: GroupService = Depends(get_group_service),
        user_id: int = Depends(get_current_user_id)
):
    """Получить список моих групп"""
    return await group_service.get_user_groups(user_id)


@router.get("/{group_id}/detail", response_model=GroupDetailResponse)
async def get_group_detail(
        group_id: int,
        group_service: GroupService = Depends(get_group_service),
        user_id: int = Depends(get_current_user_id)
):
    """Получить детальную информацию о группе"""
    return await group_service.get_group_detail(group_id, user_id)


@router.put("/{group_id}/update", response_model=GroupResponse)
async def update_group(
        group_id: int,
        group_data: GroupUpdate,
        group_service: GroupService = Depends(get_group_service),
        user_id: int = Depends(get_current_user_id)
):
    """Обновить информацию о группе"""
    return await group_service.update_group(group_id, group_data, user_id)


@router.delete("/{group_id}/delete")
async def delete_group(
        group_id: int,
        group_service: GroupService = Depends(get_group_service),
        user_id: int = Depends(get_current_user_id)
):
    """Удалить группу"""
    return await group_service.delete_group(group_id, user_id)


@router.post("/{group_id}/leave")
async def leave_group(
        group_id: int,
        group_service: GroupService = Depends(get_group_service),
        user_id: int = Depends(get_current_user_id)
):
    """Выйти из группы"""
    return await group_service.leave_group(group_id, user_id)


@router.post("/join", response_model=GroupResponse)
async def join_to_group(
        member_data: JoinGroupRequest,
        group_service: GroupService = Depends(get_group_service),
        user_id: int = Depends(get_current_user_id)
):
    """Войти в группу по инвайт ссылке"""
    return await group_service.join_group(member_data, user_id)


@router.delete("/{group_id}/members/{member_id}/remove")
async def remove_member(
        group_id: int,
        member_id: int,
        group_service: GroupService = Depends(get_group_service),
        user_id: int = Depends(get_current_user_id)
):
    """Удалить участника из группы"""
    return await group_service.remove_member(group_id, member_id, user_id)


