from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db_session
from backend.src.services.annotation_service import AnnotationService
from backend.src.api.schemas.annotation_schemas import AnnotationSave, AnnotationResponse
from ... import get_current_user_id

router = APIRouter(prefix="/annotations", tags=["annotations"])


def get_annotation_service(session: AsyncSession = Depends(get_db_session)) -> AnnotationService:
    return AnnotationService(session)


@router.get("/solution/{solution_id}", response_model=Optional[AnnotationResponse])
async def get_annotation(
    solution_id: int,
    file_key: str,
    service: AnnotationService = Depends(get_annotation_service),
    user_id: int = Depends(get_current_user_id)
):
    """Получить сохранённые пометки (выделения, рисунки) для файла решения"""
    return await service.get_annotation(solution_id, file_key, user_id)


@router.put("/solution/{solution_id}", response_model=AnnotationResponse)
async def save_annotation(
    solution_id: int,
    data: AnnotationSave,
    service: AnnotationService = Depends(get_annotation_service),
    user_id: int = Depends(get_current_user_id)
):
    """Сохранить пометки (выделения, рисунки) для файла решения"""
    return await service.save_annotation(solution_id, data.file_key, data.data, user_id)
