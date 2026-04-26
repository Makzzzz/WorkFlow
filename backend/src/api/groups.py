from fastapi import APIRouter, Depends
from src.services import GroupService
from src.models.group import GroupCreate, GroupResponse, GroupDetailResponse, AddMember, InviteResponse
from src.core.dependencies import get_current_user_id

router = APIRouter(prefix="/groups", tags=["groups"])

@router.post("/", response_model=GroupResponse)
def create_group(
    group_data: GroupCreate,
    group_service: GroupService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    return group_service.create_group(group_data, user_id)

@router.get("/my", response_model=list[GroupResponse])
def get_my_groups(
    group_service: GroupService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    return group_service.get_user_groups(user_id)

@router.get("/{group_id}", response_model=GroupDetailResponse)
def get_group_detail(
    group_id: int,
    group_service: GroupService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    return group_service.get_group_detail(group_id, user_id)

@router.post("/{group_id}/invite", response_model=InviteResponse)
def generate_invite(
    group_id: int,
    group_service: GroupService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    return group_service.generate_invite_code(group_id, user_id)

@router.post("/join/{invite_code}")
def join_group(
    invite_code: str,
    group_service: GroupService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    return group_service.join_group_by_code(invite_code, user_id)

@router.post("/{group_id}/members")
def add_member(
    group_id: int,
    member_data: AddMember,
    group_service: GroupService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    return group_service.add_member(group_id, member_data.user_id, user_id)

@router.delete("/{group_id}/members/{member_id}")
def remove_member(
    group_id: int,
    member_id: int,
    group_service: GroupService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    return group_service.remove_member(group_id, member_id, user_id)

@router.delete("/{group_id}")
def delete_group(
    group_id: int,
    group_service: GroupService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    return group_service.delete_group(group_id, user_id)

@router.post("/{group_id}/leave")
def leave_group(
    group_id: int,
    group_service: GroupService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    return group_service.leave_group(group_id, user_id)