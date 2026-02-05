from typing import Annotated

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from sumi.api.auth import User, get_current_user
from sumi.db import get_db

router = APIRouter(prefix="/api", tags=["history"])


class GenerationHistoryItem(BaseModel):
    id: str
    topic: str
    style_id: str | None = None
    style_name: str | None = None
    layout_id: str | None = None
    layout_name: str | None = None
    image_url: str | None = None
    aspect_ratio: str = "16:9"
    created_at: str


class HistoryResponse(BaseModel):
    generations: list[GenerationHistoryItem]


@router.get("/history", response_model=HistoryResponse)
async def get_history(
    user: Annotated[User, Depends(get_current_user)],
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """Get generation history for the authenticated user."""
    db = get_db()
    cursor = await db.execute(
        """SELECT id, topic, style_id, style_name, layout_id, layout_name,
                  image_url, aspect_ratio, created_at
           FROM generations
           WHERE user_id = ?
           ORDER BY created_at DESC
           LIMIT ? OFFSET ?""",
        (user.id, limit, offset),
    )
    rows = await cursor.fetchall()
    generations = [
        GenerationHistoryItem(
            id=row[0],
            topic=row[1],
            style_id=row[2],
            style_name=row[3],
            layout_id=row[4],
            layout_name=row[5],
            image_url=row[6],
            aspect_ratio=row[7],
            created_at=row[8],
        )
        for row in rows
    ]
    return HistoryResponse(generations=generations)
