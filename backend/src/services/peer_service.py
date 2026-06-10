import random
from typing import Sequence
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.src.infrastructure.repositories.task_repo import TaskRepo
from backend.src.infrastructure.repositories.solution_repo import SolutionRepo
from backend.src.infrastructure.repositories.group_repo import GroupRepo
from backend.src.infrastructure.dbEntities.solution import Solution


class PeerService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.task_repo = TaskRepo(session)
        self.solution_repo = SolutionRepo(session)
        self.group_repo = GroupRepo(session)

    async def peer_start(self, task_id: int, user_id: int) -> None:
        task = await self.task_repo.get_task_by_id(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        permission = await self.group_repo.check_user_is_expert(task.group_id,user_id)
        if not permission:
            raise HTTPException(status_code=403, detail="Запускать peer-систему может только эксперт")

        solutions = await self.solution_repo.get_solution_for_peer(task_id)
        if len(solutions) < 2:
            raise HTTPException(status_code=400, detail="Нужно минимум 2 решения для P2P проверки")
        
        random.shuffle(solutions)
        assigned_pairs = []
        n = len(solutions)
        
        for i in range(n):
            work_to_review = solutions[i]
            reviewer_id = solutions[(i + 1) % n].student_id
            assigned_pairs.append((work_to_review.id, reviewer_id)) # передаю кортеж из (id работы которую нужно обновить, id участника кого назначить)

        await self.solution_repo.batch_assign_reviewers(assigned_pairs)
        await self.session.flush()

        return {"message": f"P2P запущен. Случайно распределено {len(assigned_pairs)} проверок."}
            
                 
    async def get_my_peer_tasks(self, task_id: int, student_id: int) -> Solution:
        task = await self.task_repo.get_task_by_id(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        return await self.solution_repo.get_own_solution(task_id, student_id)