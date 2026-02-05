import asyncio
import json
import logging
import uuid
from collections import defaultdict
from datetime import datetime, timedelta

from sumi.db import get_db
from sumi.feedback.models import (
    Feedback, FeedbackStatus, FeedbackCategory,
    LLMAnalysis, STEP_PROGRESS, STEP_MESSAGES,
)

logger = logging.getLogger(__name__)


class FeedbackManager:
    def __init__(self):
        self._feedback: dict[str, Feedback] = {}
        self._listeners: dict[str, list[asyncio.Queue]] = defaultdict(list)
        self._rate_limits: dict[str, list[datetime]] = defaultdict(list)

    def check_rate_limit(self, user_id: str | None, limit: int = 5) -> bool:
        """Check if user has exceeded rate limit. Returns True if allowed."""
        key = user_id or "anonymous"
        now = datetime.utcnow()
        hour_ago = now - timedelta(hours=1)

        # Clean old entries
        self._rate_limits[key] = [
            ts for ts in self._rate_limits[key] if ts > hour_ago
        ]

        return len(self._rate_limits[key]) < limit

    def record_submission(self, user_id: str | None):
        """Record a feedback submission for rate limiting."""
        key = user_id or "anonymous"
        self._rate_limits[key].append(datetime.utcnow())

    async def create_feedback(
        self,
        content: str,
        user_id: str | None = None,
    ) -> Feedback:
        """Create a new feedback entry."""
        feedback_id = f"fb_{uuid.uuid4().hex[:12]}"
        feedback = Feedback(
            id=feedback_id,
            content=content,
            user_id=user_id,
        )
        self._feedback[feedback_id] = feedback

        # Persist to database
        db = get_db()
        await db.execute(
            """
            INSERT INTO feedback (id, user_id, content, status, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                feedback.id,
                feedback.user_id,
                feedback.content,
                feedback.status.value,
                feedback.created_at.isoformat(),
            ),
        )
        await db.commit()

        return feedback

    def get_feedback(self, feedback_id: str) -> Feedback | None:
        """Get feedback by ID from memory."""
        return self._feedback.get(feedback_id)

    async def load_feedback(self, feedback_id: str) -> Feedback | None:
        """Load feedback from database."""
        if feedback_id in self._feedback:
            return self._feedback[feedback_id]

        db = get_db()
        async with db.execute(
            "SELECT * FROM feedback WHERE id = ?", (feedback_id,)
        ) as cursor:
            row = await cursor.fetchone()
            if not row:
                return None

            feedback = Feedback(
                id=row[0],
                user_id=row[1],
                content=row[2],
                category=FeedbackCategory(row[3]) if row[3] else None,
                is_actionable=bool(row[4]),
                status=FeedbackStatus(row[5]),
                pr_url=row[6],
                pr_branch=row[7],
                llm_analysis=json.loads(row[8]) if row[8] else None,
                created_at=datetime.fromisoformat(row[9]),
                updated_at=datetime.fromisoformat(row[10]) if row[10] else None,
            )
            self._feedback[feedback_id] = feedback
            return feedback

    async def update_status(
        self,
        feedback_id: str,
        status: FeedbackStatus,
        error: str | None = None,
    ):
        """Update feedback status and notify listeners."""
        feedback = self._feedback.get(feedback_id)
        if not feedback:
            return

        feedback.status = status
        feedback.updated_at = datetime.utcnow()
        if error:
            feedback.error = error

        # Persist to database
        db = get_db()
        await db.execute(
            """
            UPDATE feedback SET status = ?, updated_at = ?
            WHERE id = ?
            """,
            (status.value, feedback.updated_at.isoformat(), feedback_id),
        )
        await db.commit()

        await self._notify(feedback_id)

    async def update_analysis(
        self,
        feedback_id: str,
        analysis: LLMAnalysis,
    ):
        """Update feedback with LLM analysis results."""
        feedback = self._feedback.get(feedback_id)
        if not feedback:
            return

        feedback.llm_analysis = analysis
        feedback.category = analysis.category
        feedback.is_actionable = analysis.is_actionable
        feedback.updated_at = datetime.utcnow()

        # Persist to database
        db = get_db()
        analysis_json = json.dumps({
            "category": analysis.category.value,
            "is_actionable": analysis.is_actionable,
            "summary": analysis.summary,
            "affected_areas": analysis.affected_areas,
            "reasoning": analysis.reasoning,
        })
        await db.execute(
            """
            UPDATE feedback
            SET category = ?, is_actionable = ?, llm_analysis = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                analysis.category.value,
                1 if analysis.is_actionable else 0,
                analysis_json,
                feedback.updated_at.isoformat(),
                feedback_id,
            ),
        )
        await db.commit()

    async def update_pr(
        self,
        feedback_id: str,
        pr_url: str,
        pr_branch: str,
    ):
        """Update feedback with PR information."""
        feedback = self._feedback.get(feedback_id)
        if not feedback:
            return

        feedback.pr_url = pr_url
        feedback.pr_branch = pr_branch
        feedback.updated_at = datetime.utcnow()

        # Persist to database
        db = get_db()
        await db.execute(
            """
            UPDATE feedback
            SET pr_url = ?, pr_branch = ?, updated_at = ?
            WHERE id = ?
            """,
            (pr_url, pr_branch, feedback.updated_at.isoformat(), feedback_id),
        )
        await db.commit()

        await self._notify(feedback_id)

    async def _notify(self, feedback_id: str):
        """Notify all listeners of a feedback update."""
        feedback = self._feedback.get(feedback_id)
        if not feedback:
            return

        event = {
            "type": "status",
            "status": feedback.status.value,
            "progress": STEP_PROGRESS.get(feedback.status, 0),
            "message": STEP_MESSAGES.get(feedback.status, ""),
            "category": feedback.category.value if feedback.category else None,
            "is_actionable": feedback.is_actionable,
            "pr_url": feedback.pr_url,
        }

        for queue in self._listeners.get(feedback_id, []):
            await queue.put(event)

    def subscribe(self, feedback_id: str) -> asyncio.Queue:
        """Subscribe to feedback updates."""
        queue: asyncio.Queue = asyncio.Queue()
        self._listeners[feedback_id].append(queue)
        return queue

    def unsubscribe(self, feedback_id: str, queue: asyncio.Queue):
        """Unsubscribe from feedback updates."""
        listeners = self._listeners.get(feedback_id, [])
        if queue in listeners:
            listeners.remove(queue)

    async def sse_generator(self, feedback_id: str):
        """Async generator yielding SSE events for feedback."""
        queue = self.subscribe(feedback_id)
        try:
            # Send current status immediately
            feedback = self.get_feedback(feedback_id)
            if feedback:
                yield {
                    "event": "status",
                    "data": json.dumps({
                        "type": "status",
                        "status": feedback.status.value,
                        "progress": STEP_PROGRESS.get(feedback.status, 0),
                        "message": STEP_MESSAGES.get(feedback.status, ""),
                        "category": feedback.category.value if feedback.category else None,
                        "is_actionable": feedback.is_actionable,
                        "pr_url": feedback.pr_url,
                    }),
                }

            while True:
                event = await asyncio.wait_for(queue.get(), timeout=300)
                event_type = event.get("type", "status")
                yield {
                    "event": event_type,
                    "data": json.dumps(event),
                }
                status = event.get("status")
                if status in (
                    FeedbackStatus.COMPLETED.value,
                    FeedbackStatus.REJECTED.value,
                    FeedbackStatus.FAILED.value,
                ):
                    break
        except asyncio.TimeoutError:
            yield {"event": "timeout", "data": "{}"}
        finally:
            self.unsubscribe(feedback_id, queue)


# Singleton
feedback_manager = FeedbackManager()
