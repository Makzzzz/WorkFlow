from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db_session
from backend.src.services.comment_pattern_service import CommentPatternService
from backend.src.infrastructure.repositories.comment_pattern_repo import CommentPatternRepo
from backend.src.infrastructure.repositories.user_repo import UserRepo
from backend.src.api.schemas.comment_pattern_schemas import CommentPatternCreate, CommentPatternUpdate, CommentPatternResponse
from ... import get_current_user_id

router = APIRouter(prefix="/comment-patterns", tags=["comment-patterns"])


def get_comment_pattern_repo(session: AsyncSession = Depends(get_db_session)) -> CommentPatternRepo:
    return CommentPatternRepo(session)


def get_user_repo(session: AsyncSession = Depends(get_db_session)) -> UserRepo:
    return UserRepo(session)


def get_comment_pattern_service(
    session: AsyncSession = Depends(get_db_session),
    comment_pattern_repo: CommentPatternRepo = Depends(get_comment_pattern_repo),
    user_repo: UserRepo = Depends(get_user_repo)
) -> CommentPatternService:
    return CommentPatternService(session, comment_pattern_repo, user_repo)


@router.post("/create", response_model=CommentPatternResponse)
async def create_comment_pattern(
    data: CommentPatternCreate,
    service: CommentPatternService = Depends(get_comment_pattern_service),
    user_id: int = Depends(get_current_user_id)
):
    """Создать шаблон комментария (сохранить текст для быстрого использования в будущем)"""
    return await service.create_comment_pattern(data, user_id)


@router.get("/all", response_model=list[CommentPatternResponse])
async def get_all_comment_patterns(
    service: CommentPatternService = Depends(get_comment_pattern_service),
    user_id: int = Depends(get_current_user_id)
):
    """Получить все мои шаблоны комментариев"""
    return await service.get_all_comment_patterns(user_id)


@router.put("/{pattern_id}/update", response_model=CommentPatternResponse)
async def update_comment_pattern(
    pattern_id: int,
    data: CommentPatternUpdate,
    service: CommentPatternService = Depends(get_comment_pattern_service),
    user_id: int = Depends(get_current_user_id)
):
    """Обновить текст шаблона комментария"""
    return await service.update_comment_pattern(user_id, pattern_id, data)


@router.delete("/{pattern_id}/delete")
async def delete_comment_pattern(
    pattern_id: int,
    service: CommentPatternService = Depends(get_comment_pattern_service),
    user_id: int = Depends(get_current_user_id)
):
    """Удалить шаблон комментария"""
    return await service.delete_comment_pattern(pattern_id, user_id)