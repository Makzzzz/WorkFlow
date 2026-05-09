from fastapi import APIRouter, Depends
from backend.src.services import TaskService
from WorkFlow.backend.src.api.schemas.task_schemas import TaskCreate, TaskUpdate, TaskResponse, CriteriaCreate, CriteriaResponse
from ... import get_current_user_id

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.post("/{group_id}/create", response_model=TaskResponse)
async def create_task(
    group_id: int,
    task_data: TaskCreate,
    task_service: TaskService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    """Создать задачу в группе (только владелец)"""
    return await task_service.create_task(group_id, task_data, user_id)


@router.get("/group/{group_id}", response_model=list[TaskResponse])
async def get_group_tasks(
    group_id: int,
    task_service: TaskService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    """Получить все задачи группы"""
    return await task_service.get_group_tasks(group_id, user_id)


@router.get("/{task_id}/detail", response_model=TaskResponse)
async def get_task_detail(
    task_id: int,
    task_service: TaskService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    """Получить детальную информацию о задаче"""
    return await task_service.get_task_detail(task_id, user_id)


@router.put("/{task_id}/update", response_model=TaskResponse)
async def update_task(
    task_id: int,
    task_data: TaskUpdate,
    task_service: TaskService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    """Обновить задачу (только владелец)"""
    return await task_service.update_task(task_id, task_data, user_id)


@router.delete("/{task_id}/delete")
async def delete_task(
    task_id: int,
    task_service: TaskService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    """Удалить задачу (только владелец)"""
    return await task_service.delete_task(task_id, user_id)


@router.post("/{task_id}/criteria/create", response_model=CriteriaResponse)
async def add_criteria(
    task_id: int,
    criteria_data: CriteriaCreate,
    task_service: TaskService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    """Добавить критерий оценки к задаче (только владелец)"""
    return await task_service.add_criteria(task_id, criteria_data, user_id)


@router.get("/{task_id}/criteria", response_model=list[CriteriaResponse])
async def get_task_criteria(
    task_id: int,
    task_service: TaskService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    """Получить все критерии задачи"""
    return await task_service.get_task_criteria(task_id, user_id)


@router.put("/criteria/{criteria_id}/update", response_model=CriteriaResponse)
async def update_criteria(
    criteria_id: int,
    criteria_data: CriteriaCreate,
    task_service: TaskService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    """Обновить критерий (только владелец)"""
    return await task_service.update_criteria(criteria_id, criteria_data, user_id)


@router.delete("/criteria/{criteria_id}/delete")
async def delete_criteria(
    criteria_id: int,
    task_service: TaskService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    """Удалить критерий (только владелец)"""
    return await task_service.delete_criteria(criteria_id, user_id)