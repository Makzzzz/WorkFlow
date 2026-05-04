from fastapi import APIRouter, Depends
from src.services import TaskService
from src.models.task import TaskCreate, TaskUpdate, TaskResponse, CriteriaCreate, CriteriaResponse
from src.core.dependencies import get_current_user_id

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.post("/{team_id}/create", response_model=TaskResponse)
def create_task(
    team_id: int,
    task_data: TaskCreate,
    task_service: TaskService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    """Создать задачу в команде (только владелец)"""
    return task_service.create_task(team_id, task_data, user_id)

@router.get("/team/{team_id}", response_model=list[TaskResponse])
def get_team_tasks(
    team_id: int,
    task_service: TaskService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    """Получить все задачи команды"""
    return task_service.get_team_tasks(team_id, user_id)

@router.get("/{task_id}/detail", response_model=TaskResponse)
def get_task_detail(
    task_id: int,
    task_service: TaskService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    """Получить детальную информацию о задаче"""
    return task_service.get_task_detail(task_id, user_id)

@router.put("/{task_id}/update", response_model=TaskResponse)
def update_task(
    task_id: int,
    task_data: TaskUpdate,
    task_service: TaskService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    """Обновить задачу (только владелец)"""
    return task_service.update_task(task_id, task_data, user_id)

@router.delete("/{task_id}/delete")
def delete_task(
    task_id: int,
    task_service: TaskService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    """Удалить задачу (только владелец)"""
    return task_service.delete_task(task_id, user_id)

@router.post("/{task_id}/criteria/create", response_model=CriteriaResponse)
def add_criteria(
    task_id: int,
    criteria_data: CriteriaCreate,
    task_service: TaskService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    """Добавить критерий оценки к задаче (только владелец)"""
    return task_service.add_criteria(task_id, criteria_data, user_id)

@router.get("/{task_id}/criteria", response_model=list[CriteriaResponse])
def get_task_criteria(
    task_id: int,
    task_service: TaskService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    """Получить все критерии задачи"""
    return task_service.get_task_criteria(task_id, user_id)

@router.put("/criteria/{criteria_id}/update", response_model=CriteriaResponse)
def update_criteria(
    criteria_id: int,
    criteria_data: CriteriaCreate,
    task_service: TaskService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    """Обновить критерий (только владелец)"""
    return task_service.update_criteria(criteria_id, criteria_data, user_id)

@router.delete("/criteria/{criteria_id}/delete")
def delete_criteria(
    criteria_id: int,
    task_service: TaskService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    """Удалить критерий (только владелец)"""
    return task_service.delete_criteria(criteria_id, user_id)