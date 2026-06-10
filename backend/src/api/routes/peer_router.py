from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db_session
from backend.src.api.schemas.solution_schemas import SolutionResponse
from backend.src.services.peer_service import PeerService
from ... import get_current_user_id


router = APIRouter(prefix="/peer", tags=["peer"])


def get_peer_service(session: AsyncSession = Depends(get_db_session),) -> PeerService:
    return PeerService(session)


@router.post("/tasks/{task_id}/peer-start")
async def peer_start(
    task_id: int,
    peer_service: PeerService = Depends(get_peer_service),
    user_id: int = Depends(get_current_user_id)
):
    """Запустить Peer ревью"""
    return await peer_service.peer_start(task_id, user_id)

@router.get("/tasks/{task_id}/my-peer", response_model=SolutionResponse)
async def get_my_peer(
    task_id: int,
    peer_service: PeerService = Depends(get_peer_service),
    user_id: int = Depends(get_current_user_id)
):
    """Получить работу на проверку"""
    return await peer_service.get_my_peer_tasks(task_id, user_id)