from fastapi import APIRouter, Depends
from src.services import FeedbackService
from src.models.feedback import FeedbackCreate, FeedbackResponse, FeedbackForCriteriaResponse
from src.core.dependencies import get_current_user_id

router = APIRouter(prefix="/feedback", tags=["feedback"])

@router.post("/solutions/{solution_id}", response_model=FeedbackResponse)
def create_feedback(
    solution_id: int,
    feedback_data: FeedbackCreate,
    feedback_service: FeedbackService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    return feedback_service.create_feedback(solution_id, feedback_data, user_id)

@router.get("/solutions/{solution_id}", response_model=FeedbackResponse)
def get_feedback_by_solution(
    solution_id: int,
    feedback_service: FeedbackService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    return feedback_service.get_feedback_by_solution(solution_id, user_id)

@router.put("/{feedback_id}", response_model=FeedbackResponse)
def update_feedback(
    feedback_id: int,
    feedback_data: FeedbackCreate,
    feedback_service: FeedbackService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    return feedback_service.update_feedback(feedback_id, feedback_data, user_id)

@router.get("/{feedback_id}/criteria", response_model=list[FeedbackForCriteriaResponse])
def get_feedback_criteria(
    feedback_id: int,
    feedback_service: FeedbackService = Depends(),
    user_id: int = Depends(get_current_user_id)
):
    return feedback_service.get_feedback_criteria(feedback_id, user_id)