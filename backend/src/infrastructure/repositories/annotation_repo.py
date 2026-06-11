from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.src.api.schemas.annotation_schemas import AnnotationData
from backend.src.infrastructure.dbEntities.annotation import Annotation


class AnnotationRepo:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_solution_and_file(self, solution_id: int, file_key: str) -> Annotation | None:
        stmt = select(Annotation).where(
            (Annotation.solution_id == solution_id) &
            (Annotation.file_key == file_key)
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def upsert(self, solution_id: int, file_key: str, data: AnnotationData, user_id: int) -> Annotation:
        annotation = await self.get_by_solution_and_file(solution_id, file_key)

        if annotation:
            annotation.data = data.model_dump()
            annotation.last_edited_by = user_id
            await self.session.flush()
            await self.session.refresh(annotation)
            return annotation

        annotation = Annotation(
            solution_id=solution_id,
            file_key=file_key,
            data=data.model_dump(),
            last_edited_by=user_id
        )
        self.session.add(annotation)
        await self.session.flush()
        await self.session.refresh(annotation)
        return annotation
