from fastapi import APIRouter, Depends
from src.services import SolutionService
from src.models.solution import SolutionCreate, SolutionResponse, SolutionUpdate
from src.core.dependencies import get_current_user_id

router = APIRouter(prefix="/solutions", tags=["solutions"])

@router.post("/tasks/{task_id}", response_model=SolutionResponse)
def submit_solution(
    task_id: int,
    solution_data: SolutionCreate,
    solution_service: SolutionService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    return solution_service.submit_solution(task_id, solution_data, user_id)

@router.get("/tasks/{task_id}/my", response_model=SolutionResponse)
def get_my_solution(
    task_id: int,
    solution_service: SolutionService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    return solution_service.get_my_solution(task_id, user_id)

@router.put("/{solution_id}", response_model=SolutionResponse)
def update_solution(
    solution_id: int,
    solution_data: SolutionUpdate,
    solution_service: SolutionService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    return solution_service.update_solution(solution_id, solution_data, user_id)

@router.get("/tasks/{task_id}/all", response_model=list[SolutionResponse])
def get_task_solutions(
    task_id: int,
    solution_service: SolutionService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    return solution_service.get_task_solutions(task_id, user_id)

@router.get("/{solution_id}", response_model=SolutionResponse)
def get_solution(
    solution_id: int,
    solution_service: SolutionService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    return solution_service.get_solution(solution_id, user_id)