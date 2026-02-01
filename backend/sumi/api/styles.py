from fastapi import APIRouter, HTTPException, Query

from sumi.api.schemas import (
    StyleResponse,
    StyleDetailResponse,
    RecommendRequest,
    RecommendResponse,
)
from sumi.catalog.styles import get_catalog
from sumi.engine.style_recommender import recommend_styles

router = APIRouter(prefix="/api/styles", tags=["styles"])


@router.get("", response_model=list[StyleResponse])
async def list_styles(
    category: str | None = Query(None),
    mood: str | None = Query(None),
    min_rating: int | None = Query(None, ge=3, le=5),
    best_for: str | None = Query(None),
    search: str | None = Query(None),
):
    catalog = get_catalog()
    styles = catalog.filter(
        category=category,
        mood=mood,
        min_rating=min_rating,
        best_for=best_for,
        search=search,
    )
    return [StyleResponse(**s.__dict__) for s in styles]


@router.get("/{style_id}", response_model=StyleDetailResponse)
async def get_style(style_id: str):
    catalog = get_catalog()
    style = catalog.get(style_id)
    if not style:
        raise HTTPException(status_code=404, detail="Style not found")
    guide = catalog.get_guide(style_id)
    return StyleDetailResponse(**style.__dict__, guide=guide)


@router.post("/recommend", response_model=RecommendResponse)
async def recommend(request: RecommendRequest):
    recommendations = await recommend_styles(request.topic)
    return RecommendResponse(recommendations=recommendations)
