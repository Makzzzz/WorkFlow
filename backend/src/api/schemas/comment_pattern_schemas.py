from datetime import datetime

from pydantic import BaseModel, Field


class CommentPatternCreate(BaseModel):
    comment: str = Field(..., min_length=1, max_length=255)


class CommentPatternUpdate(BaseModel):
    comment: str = Field(None, min_length=1, max_length=255)


class CommentPatternResponse(BaseModel):
    id: int
    comment: str
    user_id: int
    created_at: datetime

    model_config = {"from_attributes": True}
