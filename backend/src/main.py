from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.src.api.routes.auth_router import router as auth_router
from backend.src.api.routes.groups_router import router as groups_router
from backend.src.api.routes.tasks_router import router as tasks_router
from backend.src.api.routes.solutions_router import router as solutions_router
from backend.src.api.routes.feedback_router import router as feedback_router
from backend.src.api.routes.comment_pattern_router import router as comment_pattern_router
from backend.src.api.routes.speech_to_text_router import router as speech_to_text_router
from backend.src.api.routes.peer_router import router as peer_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(groups_router)
app.include_router(tasks_router)
app.include_router(solutions_router)
app.include_router(feedback_router)
app.include_router(comment_pattern_router)
app.include_router(speech_to_text_router)
app.include_router(peer_router)
