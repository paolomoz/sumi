from __future__ import annotations

import logging
from pathlib import Path

import aiosqlite

logger = logging.getLogger(__name__)

_db: aiosqlite.Connection | None = None

DB_PATH = Path(__file__).resolve().parent.parent / "sumi.db"

_SCHEMA = """
CREATE TABLE IF NOT EXISTS generations (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    topic       TEXT NOT NULL,
    style_id    TEXT,
    style_name  TEXT,
    layout_id   TEXT,
    layout_name TEXT,
    image_url   TEXT,
    aspect_ratio TEXT DEFAULT '16:9',
    created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_generations_user ON generations(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS feedback (
    id              TEXT PRIMARY KEY,
    user_id         TEXT,
    content         TEXT NOT NULL,
    category        TEXT,
    is_actionable   INTEGER DEFAULT 0,
    status          TEXT DEFAULT 'pending',
    pr_url          TEXT,
    pr_branch       TEXT,
    llm_analysis    TEXT,
    created_at      TEXT NOT NULL,
    updated_at      TEXT
);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
"""


async def init_db() -> None:
    global _db
    _db = await aiosqlite.connect(str(DB_PATH))
    await _db.execute("PRAGMA journal_mode=WAL")
    await _db.executescript(_SCHEMA)
    await _db.commit()
    logger.info("Database initialized at %s", DB_PATH)


async def close_db() -> None:
    global _db
    if _db:
        await _db.close()
        _db = None


def get_db() -> aiosqlite.Connection:
    if _db is None:
        raise RuntimeError("Database not initialized")
    return _db
