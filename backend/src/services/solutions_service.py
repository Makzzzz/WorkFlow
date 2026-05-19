from fastapi import HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Sequence
from backend.src.services.s3_service import S3StorageService

from backend.src.infrastructure.repositories.solution_repo import SolutionRepo
from backend.src.api.schemas.solution_schemas import SolutionCreate, SolutionUpdate
from backend.src.infrastructure.dbEntities.solution import Solution


class SolutionService:
    def __init__(self, session: AsyncSession, s3_service: S3StorageService):
        self.session = session
        self.solution_repo = SolutionRepo(session)
        self.s3_service = s3_service

    async def submit_solution(self, task_id: int, file: UploadFile, user_id: int) -> Solution:

        file_url = await self.s3_service.upload_file(file, folder=f"solutions/task_{task_id}")

        solution_data = SolutionCreate(file_path=file_url)      
        return await self.solution_repo.create_solution(solution_data, user_id, task_id)

    async def get_my_solution(self, task_id: int, user_id: int) -> Solution:
        sol = await self.solution_repo.get_own_solution(task_id, user_id)
        if not sol:
            raise HTTPException(status_code=404, detail="Solution not found")
        return sol

    async def get_task_solutions(self, task_id: int, user_id: int) -> Sequence[Solution]:
        return await self.solution_repo.get_task_solutions(task_id)

    async def get_solution_detail(self, solution_id: int, user_id: int) -> Solution:
        sol = await self.solution_repo.get_solution_detail(solution_id)
        if not sol:
            raise HTTPException(status_code=404, detail="Solution not found")
        return sol

    async def update_solution(self, solution_id: int, file: UploadFile, user_id: int) -> Solution:
        new_file_url = await self.s3_service.upload_file(file, folder=f"solutions/task_{solution_id}")
        update_data = SolutionUpdate(file_path=new_file_url)
        updated = await self.solution_repo.update_solution(solution_id, update_data)
        if not updated:
            raise HTTPException(status_code=404, detail="Solution not found")
        return updated

    async def delete_solution(self, solution_id: int, user_id: int) -> dict:
        success = await self.solution_repo.delete_solution(solution_id)
        if not success:
            raise HTTPException(status_code=404, detail="Solution not found")
        return {"message": "Solution deleted successfully"}