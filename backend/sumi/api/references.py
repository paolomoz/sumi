from fastapi import APIRouter, HTTPException

from sumi.api.schemas import (
    LayoutResponse,
    LayoutDetailResponse,
    StyleResponse,
    StyleDetailResponse,
    RecommendRequest,
    RecommendResponse,
    CombinationRecommendation,
)
from sumi.references.loader import get_references
from sumi.engine.combination_recommender import recommend_combinations
from sumi.engine.content_analyzer import analyze_content
from sumi.engine.content_synthesizer import synthesize_if_needed

router = APIRouter(prefix="/api", tags=["references"])


@router.get("/layouts", response_model=list[LayoutResponse])
async def list_layouts():
    refs = get_references()
    return [
        LayoutResponse(
            id=l.id,
            name=l.name,
            best_for=l.best_for,
            recommended_pairings=l.recommended_pairings,
        )
        for l in refs.list_layouts()
    ]


@router.get("/layouts/{layout_id}", response_model=LayoutDetailResponse)
async def get_layout(layout_id: str):
    refs = get_references()
    layout = refs.get_layout(layout_id)
    if not layout:
        raise HTTPException(status_code=404, detail="Layout not found")
    return LayoutDetailResponse(
        id=layout.id,
        name=layout.name,
        best_for=layout.best_for,
        recommended_pairings=layout.recommended_pairings,
        content=layout.content,
    )


@router.get("/styles", response_model=list[StyleResponse])
async def list_styles():
    refs = get_references()
    return [
        StyleResponse(
            id=s.id,
            name=s.name,
            best_for=s.best_for,
        )
        for s in refs.list_styles()
    ]


@router.get("/styles/{style_id}", response_model=StyleDetailResponse)
async def get_style(style_id: str):
    refs = get_references()
    style = refs.get_style(style_id)
    if not style:
        raise HTTPException(status_code=404, detail="Style not found")
    return StyleDetailResponse(
        id=style.id,
        name=style.name,
        best_for=style.best_for,
        content=style.content,
    )


@router.post("/recommend", response_model=RecommendResponse)
async def recommend(request: RecommendRequest):
    topic = await synthesize_if_needed(request.topic)
    analysis = await analyze_content(topic)
    recommendations = await recommend_combinations(topic, analysis)
    return RecommendResponse(
        recommendations=[CombinationRecommendation(**r) for r in recommendations]
    )
