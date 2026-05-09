from fastapi import APIRouter, Depends
from backend.src.services import FeedbackService
from WorkFlow.backend.src.api.schemas.feedback_schemas import FeedbackCreate, FeedbackResponse, FeedbackForCriteriaResponse
from ... import get_current_user_id

router = APIRouter(prefix="/feedback", tags=["feedback"])


@router.post("/solution/{solution_id}/create", response_model=FeedbackResponse)
async def create_feedback(
    solution_id: int,
    feedback_data: FeedbackCreate,
    feedback_service: FeedbackService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    """Оставить фидбек на решение (только эксперт/владелец)"""
    return await feedback_service.create_feedback(solution_id, feedback_data, user_id)

@router.get("/solution/{solution_id}", response_model=FeedbackResponse)
async def get_feedback_by_solution(
    solution_id: int,
    feedback_service: FeedbackService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    """Получить фидбек для решения"""
    return await feedback_service.get_feedback_by_solution(solution_id, user_id)

@router.put("/{feedback_id}/update", response_model=FeedbackResponse)
async def update_feedback(
    feedback_id: int,
    feedback_data: FeedbackCreate,
    feedback_service: FeedbackService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    """Обновить фидбек (только эксперт/владелец)"""
    return await feedback_service.update_feedback(feedback_id, feedback_data, user_id)

@router.get("/{feedback_id}/criteria", response_model=list[FeedbackForCriteriaResponse])
async def get_feedback_criteria(
    feedback_id: int,
    feedback_service: FeedbackService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    """Получить фидбек по критериям"""
    return await feedback_service.get_feedback_criteria(feedback_id, user_id)