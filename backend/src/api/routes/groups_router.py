from fastapi import APIRouter, Depends
from backend.src.services import GroupService
from WorkFlow.backend.src.api.schemas.group_schemas import GroupCreate, GroupResponse, GroupDetailResponse, AddMember, InviteLinkResponse
from ... import get_current_user_id

router = APIRouter(prefix="/groups", tags=["groups"])


@router.post("/create", response_model=GroupResponse)
async def create_group(
    group_data: GroupCreate,
    group_service: GroupService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    """Создать новую группу"""
    return await group_service.create_group(group_data, user_id)


@router.get("/my", response_model=list[GroupResponse])
async def get_my_groups(
    group_service: GroupService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    """Получить список моих групп"""
    return await group_service.get_user_groups(user_id)


@router.get("/{group_id}/detail", response_model=GroupDetailResponse)
async def get_group_detail(
    group_id: int,
    group_service: GroupService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    """Получить детальную информацию о группе (участники, задачи)"""
    return await group_service.get_group_detail(group_id, user_id)


@router.put("/{group_id}/update", response_model=GroupResponse)
async def update_group(
    group_id: int,
    group_data: GroupCreate,
    group_service: GroupService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    """Обновить информацию о группе (только владелец)"""
    return await group_service.update_group(group_id, group_data, user_id)


@router.delete("/{group_id}/delete")
async def delete_group(
    group_id: int,
    group_service: GroupService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    """Удалить группу (только владелец)"""
    return await group_service.delete_group(group_id, user_id)


@router.post("/{group_id}/leave")
async def leave_group(
    group_id: int,
    group_service: GroupService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    """Выйти из группы (нельзя владельцу)"""
    return await group_service.leave_group(group_id, user_id)


@router.post("/{group_id}/members/add")
async def add_member(
    group_id: int,
    member_data: AddMember,
    group_service: GroupService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    """Добавить участника в группу (только владелец)"""
    return await group_service.add_member(group_id, member_data.user_id, user_id)


@router.delete("/{group_id}/members/{member_id}/remove")
async def remove_member(
    group_id: int,
    member_id: int,
    group_service: GroupService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    """Удалить участника из группы (только владелец)"""
    return await group_service.remove_member(group_id, member_id, user_id)


# ИЗМЕНЯТЬ
@router.post("/{group_id}/invite-link", response_model=InviteLinkResponse)
async def generate_invite_link(
    group_id: int,
    group_service: GroupService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    """Сгенерировать ссылку-приглашение в группу (только владелец)"""
    return await group_service.generate_invite_link(group_id, user_id)


@router.post("/join-by-link/{token}")
async def join_group_by_link(
    token: str,
    group_service: GroupService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    """Вступить в группу по ссылке-приглашению (заглушка)"""
    return await group_service.join_group_by_link(token, user_id)