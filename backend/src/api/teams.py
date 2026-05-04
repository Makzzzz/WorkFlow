from fastapi import APIRouter, Depends
from src.services import TeamService
from src.models.team import TeamCreate, TeamResponse, TeamDetailResponse, AddMember, InviteLinkResponse
from src.core.dependencies import get_current_user_id

router = APIRouter(prefix="/teams", tags=["teams"])


@router.post("/create", response_model=TeamResponse)
def create_team(
    team_data: TeamCreate,
    team_service: TeamService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    """Создать новую команду"""
    return team_service.create_team(team_data, user_id)

@router.get("/my", response_model=list[TeamResponse])
def get_my_teams(
    team_service: TeamService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    """Получить список моих команд"""
    return team_service.get_user_teams(user_id)

@router.get("/{team_id}/detail", response_model=TeamDetailResponse)
def get_team_detail(
    team_id: int,
    team_service: TeamService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    """Получить детальную информацию о команде (участники, задачи)"""
    return team_service.get_team_detail(team_id, user_id)

@router.put("/{team_id}/update", response_model=TeamResponse)
def update_team(
    team_id: int,
    team_data: TeamCreate,
    team_service: TeamService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    """Обновить информацию о команде (только владелец)"""
    return team_service.update_team(team_id, team_data, user_id)

@router.delete("/{team_id}/delete")
def delete_team(
    team_id: int,
    team_service: TeamService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    """Удалить команду (только владелец)"""
    return team_service.delete_team(team_id, user_id)

@router.post("/{team_id}/leave")
def leave_team(
    team_id: int,
    team_service: TeamService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    """Выйти из команды (нельзя владельцу)"""
    return team_service.leave_team(team_id, user_id)

@router.post("/{team_id}/members/add")
def add_member(
    team_id: int,
    member_data: AddMember,
    team_service: TeamService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    """Добавить участника в команду (только владелец)"""
    return team_service.add_member(team_id, member_data.user_id, user_id)

@router.delete("/{team_id}/members/{member_id}/remove")
def remove_member(
    team_id: int,
    member_id: int,
    team_service: TeamService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    """Удалить участника из команды (только владелец)"""
    return team_service.remove_member(team_id, member_id, user_id)







# Здесь много вопросов
@router.post("/{team_id}/invite-link", response_model=InviteLinkResponse)
def generate_invite_link(
    team_id: int,
    team_service: TeamService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    pass
@router.post("/join-by-link/{token}")
def join_team_by_link(
    token: str,
    team_service: TeamService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    pass