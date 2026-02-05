from fastapi import APIRouter

from sumi.api.generate import router as generate_router
from sumi.api.history import router as history_router
from sumi.api.references import router as references_router
from sumi.api.upload import router as upload_router
from sumi.api.feedback import router as feedback_router
from sumi.api.schemas import HealthResponse

api_router = APIRouter()
api_router.include_router(generate_router)
api_router.include_router(history_router)
api_router.include_router(references_router)
api_router.include_router(upload_router)
api_router.include_router(feedback_router)


@api_router.get("/api/health", response_model=HealthResponse, tags=["health"])
async def health_check():
    return HealthResponse()
