"""Monitor dashboard API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from sumi.config import settings
from sumi.db import get_db

router = APIRouter(prefix="/api/monitor", tags=["monitor"])


async def verify_monitor_key(key: str = Query(...)):
    if not settings.monitor_secret or key != settings.monitor_secret:
        raise HTTPException(status_code=403, detail="Invalid monitor key")


class VolumeStats(BaseModel):
    total: int
    last_hour: int
    last_day: int
    last_7_days: int
    last_30_days: int


class LeaderboardEntry(BaseModel):
    user_id: str
    generation_count: int
    last_active: str


class StyleEntry(BaseModel):
    style_id: str
    style_name: str
    count: int


class GenerationItem(BaseModel):
    id: str
    user_id: str
    topic: str
    style_id: str | None = None
    style_name: str | None = None
    layout_id: str | None = None
    layout_name: str | None = None
    aspect_ratio: str = "16:9"
    created_at: str


class GenerationsResponse(BaseModel):
    generations: list[GenerationItem]
    total: int


class MultiStyleEntry(BaseModel):
    user_id: str
    topic: str
    style_count: int
    styles: str
    first_created: str
    last_created: str


class FeedbackItem(BaseModel):
    id: str
    user_id: str | None = None
    content: str
    category: str | None = None
    is_actionable: bool = False
    status: str = "pending"
    pr_url: str | None = None
    created_at: str


class FeedbackResponse(BaseModel):
    feedback: list[FeedbackItem]
    total: int
    by_category: dict[str, int]
    by_status: dict[str, int]


@router.get("/stats", response_model=VolumeStats)
async def get_stats(_: None = Depends(verify_monitor_key)):
    db = get_db()
    cursor = await db.execute("""
        SELECT COUNT(*) AS total,
          SUM(CASE WHEN created_at >= datetime('now','-1 hour') THEN 1 ELSE 0 END) AS last_hour,
          SUM(CASE WHEN created_at >= datetime('now','-1 day') THEN 1 ELSE 0 END) AS last_day,
          SUM(CASE WHEN created_at >= datetime('now','-7 days') THEN 1 ELSE 0 END) AS last_7_days,
          SUM(CASE WHEN created_at >= datetime('now','-30 days') THEN 1 ELSE 0 END) AS last_30_days
        FROM generations
    """)
    row = await cursor.fetchone()
    return VolumeStats(
        total=row[0] or 0,
        last_hour=row[1] or 0,
        last_day=row[2] or 0,
        last_7_days=row[3] or 0,
        last_30_days=row[4] or 0,
    )


@router.get("/leaderboard", response_model=list[LeaderboardEntry])
async def get_leaderboard(_: None = Depends(verify_monitor_key)):
    db = get_db()
    cursor = await db.execute("""
        SELECT user_id, COUNT(*) AS generation_count, MAX(created_at) AS last_active
        FROM generations GROUP BY user_id ORDER BY generation_count DESC LIMIT 20
    """)
    rows = await cursor.fetchall()
    return [
        LeaderboardEntry(user_id=r[0], generation_count=r[1], last_active=r[2])
        for r in rows
    ]


@router.get("/styles", response_model=list[StyleEntry])
async def get_styles(_: None = Depends(verify_monitor_key)):
    db = get_db()
    cursor = await db.execute("""
        SELECT style_id, style_name, COUNT(*) AS count
        FROM generations WHERE style_id IS NOT NULL
        GROUP BY style_id, style_name ORDER BY count DESC
    """)
    rows = await cursor.fetchall()
    return [StyleEntry(style_id=r[0], style_name=r[1], count=r[2]) for r in rows]


@router.get("/generations", response_model=GenerationsResponse)
async def get_generations(
    _: None = Depends(verify_monitor_key),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    db = get_db()
    count_cursor = await db.execute("SELECT COUNT(*) FROM generations")
    total = (await count_cursor.fetchone())[0]

    cursor = await db.execute(
        """SELECT id, user_id, topic, style_id, style_name,
                  layout_id, layout_name, aspect_ratio, created_at
           FROM generations ORDER BY created_at DESC LIMIT ? OFFSET ?""",
        (limit, offset),
    )
    rows = await cursor.fetchall()
    generations = [
        GenerationItem(
            id=r[0], user_id=r[1], topic=r[2], style_id=r[3], style_name=r[4],
            layout_id=r[5], layout_name=r[6], aspect_ratio=r[7], created_at=r[8],
        )
        for r in rows
    ]
    return GenerationsResponse(generations=generations, total=total)


@router.get("/multi-style", response_model=list[MultiStyleEntry])
async def get_multi_style(_: None = Depends(verify_monitor_key)):
    db = get_db()
    cursor = await db.execute("""
        SELECT user_id, topic, COUNT(DISTINCT style_id) AS style_count,
          GROUP_CONCAT(DISTINCT style_name) AS styles,
          MIN(created_at) AS first_created, MAX(created_at) AS last_created
        FROM generations WHERE style_id IS NOT NULL
        GROUP BY user_id, topic HAVING COUNT(DISTINCT style_id) >= 2
        ORDER BY last_created DESC LIMIT 50
    """)
    rows = await cursor.fetchall()
    return [
        MultiStyleEntry(
            user_id=r[0], topic=r[1], style_count=r[2], styles=r[3] or "",
            first_created=r[4], last_created=r[5],
        )
        for r in rows
    ]


@router.get("/feedback", response_model=FeedbackResponse)
async def get_feedback(
    _: None = Depends(verify_monitor_key),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    db = get_db()
    count_cursor = await db.execute("SELECT COUNT(*) FROM feedback")
    total = (await count_cursor.fetchone())[0]

    cursor = await db.execute(
        """SELECT id, user_id, content, category, is_actionable,
                  status, pr_url, created_at
           FROM feedback ORDER BY created_at DESC LIMIT ? OFFSET ?""",
        (limit, offset),
    )
    rows = await cursor.fetchall()
    feedback = [
        FeedbackItem(
            id=r[0], user_id=r[1], content=r[2], category=r[3],
            is_actionable=bool(r[4]), status=r[5], pr_url=r[6], created_at=r[7],
        )
        for r in rows
    ]

    # Category breakdown
    cat_cursor = await db.execute(
        "SELECT COALESCE(category, 'uncategorized'), COUNT(*) FROM feedback GROUP BY category"
    )
    by_category = {r[0]: r[1] for r in await cat_cursor.fetchall()}

    # Status breakdown
    status_cursor = await db.execute(
        "SELECT status, COUNT(*) FROM feedback GROUP BY status"
    )
    by_status = {r[0]: r[1] for r in await status_cursor.fetchall()}

    return FeedbackResponse(
        feedback=feedback, total=total, by_category=by_category, by_status=by_status,
    )
