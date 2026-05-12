from fastapi import APIRouter, Depends
from backend.src.services import SolutionService
from backend.src.api.schemas.solution_schemas import SolutionCreate, SolutionResponse, SolutionUpdate
from ... import get_current_user_id

router = APIRouter(prefix="/solutions", tags=["solutions"])


@router.post("/task/{task_id}/submit", response_model=SolutionResponse)
async def submit_solution(
    task_id: int,
    solution_data: SolutionCreate,
    solution_service: SolutionService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    """Отправить решение на задачу"""
    return await solution_service.submit_solution(task_id, solution_data, user_id)

@router.get("/task/{task_id}/my-solution", response_model=SolutionResponse)
async def get_my_solution(
    task_id: int,
    solution_service: SolutionService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    """Получить моё решение для задачи"""
    return await solution_service.get_my_solution(task_id, user_id)

@router.put("/{solution_id}/update", response_model=SolutionResponse)
async def update_solution(
    solution_id: int,
    solution_data: SolutionUpdate,
    solution_service: SolutionService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    """Обновить моё решение"""
    return await solution_service.update_solution(solution_id, solution_data, user_id)

@router.get("/task/{task_id}/all-solutions", response_model=list[SolutionResponse])
async def get_task_solutions(
    task_id: int,
    solution_service: SolutionService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    """Получить все решения на задачу"""
    return await solution_service.get_task_solutions(task_id, user_id)

@router.get("/{solution_id}/detail", response_model=SolutionResponse)
async def get_solution_detail(
    solution_id: int,
    solution_service: SolutionService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    """Получить информацию о решении"""
    return await solution_service.get_solution_detail(solution_id, user_id)