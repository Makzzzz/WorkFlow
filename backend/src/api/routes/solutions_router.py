from fastapi import APIRouter, Depends, HTTPException, Response, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from mimetypes import guess_type

from database import get_db_session
from backend.src.services.solutions_service import SolutionService
from backend.src.services.s3_service import S3StorageService
from backend.src.api.schemas.solution_schemas import SolutionDetailResponse, SolutionResponse, SolutionUpdate
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
    files: list[UploadFile] = File(...),
    solution_service: SolutionService = Depends(get_solution_service),
    user_id: int = Depends(get_current_user_id)
):
    """Отправить решение на задачу (файлы автоматически загрузится в S3)"""
    return await solution_service.submit_solution(task_id, files, user_id)


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
    files: list[UploadFile] = File(...),
    solution_service: SolutionService = Depends(get_solution_service),
    user_id: int = Depends(get_current_user_id)
):
    """Заменить файл решения (старые файлы останутся в S3, обновится только ссылка в БД)"""
    return await solution_service.update_solution(solution_id, files, user_id)


@router.get("/task/{task_id}/all-solutions", response_model=list[SolutionResponse])
async def get_task_solutions(
    task_id: int,
    solution_service: SolutionService = Depends(get_solution_service),
    user_id: int = Depends(get_current_user_id)
):
    """Получить все решения на задачу"""
    return await solution_service.get_task_solutions(task_id, user_id)


@router.get("/{solution_id}/detail", response_model=SolutionDetailResponse)
async def get_solution_detail(
    solution_id: int,
    solution_service: SolutionService = Depends(get_solution_service),
    user_id: int = Depends(get_current_user_id)
):
    """Получить детальную информацию о решении (с временными ссылками на файлы)"""
    return await solution_service.get_solution_detail(solution_id, user_id)


@router.delete("/{solution_id}/delete")
async def delete_solution(
    solution_id: int,
    solution_service: SolutionService = Depends(get_solution_service),
    user_id: int = Depends(get_current_user_id)
):
    """Удалить решение"""
    return await solution_service.delete_solution(solution_id, user_id)


# @router.get("/{solution_id}/download")
# async def download_solution_file(
#     solution_id: int,
#     file_name: str,
#     s3_service: S3StorageService = Depends(get_s3_service),
#     solution_service: SolutionService = Depends(get_solution_service),
#     user_id: int = Depends(get_current_user_id)
# ):
#     """Скачать конкретный файл из папки решения"""
#     solution = await solution_service.get_solution_raw(solution_id)
#     if not solution or not solution.file_path:
#         raise HTTPException(status_code=404, detail="Решение или файлы не найдены")

#     object_key = f"{solution.file_path}/{file_name}"
#     full_url = f"{s3_service.endpoint}/{s3_service.bucket}/{object_key}"
    
#     file_bytes = await s3_service.download_file(full_url)

#     ext = file_name.rsplit(".", 1)[-1] if "." in file_name else "bin"
#     mime_type, _ = guess_type(f"file.{ext}")
#     media_type = mime_type or "application/octet-stream"
    
#     return Response(
#         content=file_bytes,
#         media_type=media_type,
#         headers={"Content-Disposition": f"attachment; filename={file_name}"}
#     )