from fastapi import HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Sequence
from backend.src.services.s3_service import S3StorageService

from backend.src.infrastructure.repositories.solution_repo import SolutionRepo
from backend.src.infrastructure.repositories.task_repo import TaskRepo
from backend.src.infrastructure.repositories.group_repo import GroupRepo
from backend.src.api.schemas.solution_schemas import SolutionCreate, SolutionUpdate
from backend.src.infrastructure.dbEntities.solution import Solution


class SolutionService:
    def __init__(self, session: AsyncSession, s3_service: S3StorageService):
        self.session = session
        self.solution_repo = SolutionRepo(session)
        self.task_repo = TaskRepo(session)
        self.group_repo = GroupRepo(session)
        self.s3_service = s3_service

    async def submit_solution(self, task_id: int, files: list[UploadFile], user_id: int) -> Solution:
        folder_path = await self.s3_service.upload_files(files, folder=f"solutions/task_{task_id}")
        solution_data = SolutionCreate(file_path=folder_path)
        return await self.solution_repo.create_solution(solution_data, user_id, task_id)

    async def get_my_solution(self, task_id: int, user_id: int) -> Solution:
        task = await self.task_repo.get_task_by_id(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        if not await self.group_repo.check_user_is_member(task.group_id, user_id):
            raise HTTPException(status_code=403, detail="You are not a member of this task's group")

        sol = await self.solution_repo.get_own_solution(task_id, user_id)
        if not sol:
            raise HTTPException(status_code=404, detail="Solution not found")
        return sol

    async def get_task_solutions(self, task_id: int, user_id: int) -> Sequence[Solution]:
        task = await self.task_repo.get_task_by_id(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        if not await self.group_repo.check_user_is_member(task.group_id, user_id):
            raise HTTPException(status_code=403, detail="You are not a member of this task's group")

        return await self.solution_repo.get_task_solutions(task_id)

    async def get_solution_detail(self, solution_id: int, user_id: int) -> dict:
        solution = await self.solution_repo.get_solution_detail(solution_id)
        if not solution:
            raise HTTPException(status_code=404, detail="Solution not found")

        try:
            file_urls = await self.s3_service.list_files_in_folder(solution.file_path)
        except Exception:
            raise HTTPException(status_code=502, detail="Не удалось получить список файлов из хранилища")

        presigned_urls = []
        prefix = f"{self.s3_service.endpoint}/{self.s3_service.bucket}/"
        for file_url in file_urls:
            object_key = file_url[len(prefix):] if file_url.startswith(prefix) else file_url
            try:
                presigned_url = await self.s3_service.generate_presigned_url(object_key, expiration=3600)
                presigned_urls.append(presigned_url)
            except Exception:
                continue

        return {
            "id": solution.id,
            "student_id": solution.student_id,
            "task_id": solution.task_id,
            "status": solution.status,
            "uploaded_at": solution.uploaded_at,
            "file_urls": presigned_urls
        }

    async def update_solution(self, solution_id: int, files: list[UploadFile], user_id: int) -> Solution:
        new_folder_path = await self.s3_service.upload_files(files, folder=f"solutions/update_{solution_id}")
        update_data = SolutionUpdate(file_path=new_folder_path)
        updated = await self.solution_repo.update_solution(solution_id, update_data)
        if not updated:
            raise HTTPException(status_code=404, detail="Solution not found")
        return updated

    async def delete_solution(self, solution_id: int, user_id: int) -> dict:
        sol = await self.solution_repo.get_solution_by_id(solution_id)
        if not sol:
            raise HTTPException(status_code=404, detail="Solution not found")
        
        if sol.student_id != user_id:
            raise HTTPException(status_code=403, detail="You are not the owner of this solution")

        success = await self.solution_repo.delete_solution(solution_id)
        if not success:
            raise HTTPException(status_code=404, detail="Solution not found")
        return {"message": "Solution deleted successfully"}

    async def get_solution_raw(self, solution_id: int) -> Solution | None:
        return await self.solution_repo.get_solution_by_id(solution_id)