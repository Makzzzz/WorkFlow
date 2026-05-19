from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db_session
from backend.src.services.solutions_service import SolutionService
from backend.src.services.s3_service import S3StorageService
from backend.src.api.schemas.solution_schemas import SolutionResponse, SolutionUpdate
from ... import get_current_user_id

router = APIRouter(prefix="/solutions", tags=["solutions"])


def get_s3_service() -> S3StorageService:
    return S3StorageService()


def get_solution_service(
    session: AsyncSession = Depends(get_db_session),
    s3_service: S3StorageService = Depends(get_s3_service)
) -> SolutionService:
    return SolutionService(session, s3_service)


@router.post("/task/{task_id}/submit", response_model=SolutionResponse)
async def submit_solution(
    task_id: int,
    file: UploadFile = File(...),
    solution_service: SolutionService = Depends(get_solution_service),
    user_id: int = Depends(get_current_user_id)
):
    """Отправить решение на задачу (файл автоматически загрузится в S3)"""
    return await solution_service.submit_solution(task_id, file, user_id)


@router.get("/task/{task_id}/my-solution", response_model=SolutionResponse)
async def get_my_solution(
    task_id: int,
    solution_service: SolutionService = Depends(get_solution_service),
    user_id: int = Depends(get_current_user_id)
):
    """Получить моё решение для задачи"""
    return await solution_service.get_my_solution(task_id, user_id)


@router.put("/{solution_id}/update", response_model=SolutionResponse)
async def update_solution(
    solution_id: int,
    file: UploadFile = File(...),
    solution_service: SolutionService = Depends(get_solution_service),
    user_id: int = Depends(get_current_user_id)
):
    """Заменить файл решения (старый файл останется в S3, обновится только ссылка в БД)"""
    return await solution_service.update_solution(solution_id, file, user_id)


@router.get("/task/{task_id}/all-solutions", response_model=list[SolutionResponse])
async def get_task_solutions(
    task_id: int,
    solution_service: SolutionService = Depends(get_solution_service),
    user_id: int = Depends(get_current_user_id)
):
    """Получить все решения на задачу"""
    return await solution_service.get_task_solutions(task_id, user_id)


@router.get("/{solution_id}/detail", response_model=SolutionResponse)
async def get_solution_detail(
    solution_id: int,
    solution_service: SolutionService = Depends(get_solution_service),
    user_id: int = Depends(get_current_user_id)
):
    """Получить информацию о решении"""
    return await solution_service.get_solution_detail(solution_id, user_id)


@router.delete("/{solution_id}/delete")
async def delete_solution(
    solution_id: int,
    solution_service: SolutionService = Depends(get_solution_service),
    user_id: int = Depends(get_current_user_id)
):
    """Удалить решение"""
    return await solution_service.delete_solution(solution_id, user_id)