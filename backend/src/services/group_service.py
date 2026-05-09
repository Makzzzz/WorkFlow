from fastapi import HTTPException, status
from typing import List
from backend.src.infrastructure.repositories.group_repo import GroupRepo
from backend.src.api.schemas.group_schemas import (
    GroupCreate, GroupResponse, GroupDetailResponse, InviteLinkResponse, UserResponse
)
from backend.src.api.schemas.task_schemas import TaskResponse


class TeamService:
    def __init__(self, repo: GroupRepo):
        self.repo = repo

    def create_team(self, GroupCreate, user_id):
        db_team = self.repo.cre
    