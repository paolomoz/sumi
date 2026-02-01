from fastapi import APIRouter

from sumi.api.generate import router as generate_router
from sumi.api.styles import router as styles_router
from sumi.api.schemas import HealthResponse

api_router = APIRouter()
api_router.include_router(generate_router)
api_router.include_router(styles_router)


@api_router.get("/api/health", response_model=HealthResponse, tags=["health"])
async def health_check():
    return HealthResponse()
