from typing import Sequence

from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession

from backend.src.api.schemas.comment_pattern_schemas import CommentPatternCreate, CommentPatternUpdate
from backend.src.infrastructure.dbEntities.comment_pattern import CommentPattern


class CommentPatternRepo:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_comment_pattern(self, current_user_id: int, data: CommentPatternCreate) -> CommentPattern:
        comment_pattern = CommentPattern(
            comment=data.comment,
            user_id=current_user_id
        )
        self.session.add(comment_pattern)
        await self.session.flush()
        return comment_pattern

    async def get_comment_pattern_by_id(self, comment_pattern_id: int) -> CommentPattern | None:
        stmt = select(CommentPattern).where(CommentPattern.id == comment_pattern_id)
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def get_all_comment_patterns(self, current_user_id: int) -> Sequence[CommentPattern]:
        stmt = (
            select(CommentPattern)
            .where(CommentPattern.user_id == current_user_id)
            .order_by(CommentPattern.created_at.desc())
        )

        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def update_comment_pattern(self, updated_comment_pattern: CommentPatternUpdate,
                                     comment_pattern_id: int) -> CommentPattern | None:
        updated_pattern = updated_comment_pattern.model_dump(exclude_unset=True)

        if not updated_pattern:
            return await self.get_comment_pattern_by_id(comment_pattern_id)

        stmt = (
            update(CommentPattern)
            .where(CommentPattern.id == comment_pattern_id)
            .values(**updated_pattern)
        )
        result = await self.session.execute(stmt)
        if result.rowcount == 0:
            return None

        return await self.get_comment_pattern_by_id(comment_pattern_id)

    async def delete_comment_pattern(self, comment_pattern_id: int) -> bool:
        stmt = delete(CommentPattern).where(CommentPattern.id == comment_pattern_id)
        result = await self.session.execute(stmt)
        return result.rowcount > 0
