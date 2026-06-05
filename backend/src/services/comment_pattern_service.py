from typing import Sequence

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.src.api.schemas.comment_pattern_schemas import CommentPatternCreate, CommentPatternUpdate
from backend.src.infrastructure.dbEntities.comment_pattern import CommentPattern
from backend.src.infrastructure.repositories.comment_pattern_repo import CommentPatternRepo
from backend.src.infrastructure.repositories.user_repo import UserRepo


class CommentPatternService:
    def __init__(self, session: AsyncSession, comment_pattern_repo: CommentPatternRepo, user_repo: UserRepo):
        self.session = session
        self.comment_pattern_repo = comment_pattern_repo
        self.user_repo = user_repo

    async def create_comment_pattern(self, data: CommentPatternCreate, user_id: int) -> CommentPattern:
        user = await self.user_repo.get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        return await self.comment_pattern_repo.create_comment_pattern(user_id, data)

    async def get_all_comment_patterns(self, user_id: int) -> Sequence[CommentPattern]:
        user = await self.user_repo.get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        return await self.comment_pattern_repo.get_all_comment_patterns(user_id)

    async def update_comment_pattern(self, user_id: int, comment_pattern_id: int,
                                     data: CommentPatternUpdate) -> CommentPattern:
        user = await self.user_repo.get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        comment_pattern = await self.comment_pattern_repo.get_comment_pattern_by_id(comment_pattern_id)
        if not comment_pattern:
            raise HTTPException(status_code=404, detail="Comment pattern not found")

        return await self.comment_pattern_repo.update_comment_pattern(data, comment_pattern_id)

    async def delete_comment_pattern(self, comment_pattern_id: int, user_id: int) -> dict:
        user = await self.user_repo.get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        success = self.comment_pattern_repo.delete_comment_pattern(comment_pattern_id)
        if not success:
            raise HTTPException(status_code=404, detail="Comment pattern not found")

        return {"message": "Comment pattern removed successfully"}
