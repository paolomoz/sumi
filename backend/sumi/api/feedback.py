"""Feedback API endpoints."""

import asyncio
import logging

from fastapi import APIRouter, BackgroundTasks, Header, HTTPException
from sse_starlette.sse import EventSourceResponse

from sumi.api.schemas import FeedbackRequest, FeedbackResponse, FeedbackStatusResponse
from sumi.feedback.manager import feedback_manager
from sumi.feedback.pipeline import process_feedback
from sumi.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/feedback", tags=["feedback"])


@router.post("", response_model=FeedbackResponse)
async def submit_feedback(
    request: FeedbackRequest,
    background_tasks: BackgroundTasks,
    x_user_id: str | None = Header(None),
):
    """Submit user feedback for processing.

    The feedback will be categorized and, if actionable, code changes
    will be generated and a PR created.
    """
    # Check rate limit
    if not feedback_manager.check_rate_limit(
        x_user_id, settings.feedback_rate_limit_per_hour
    ):
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Please try again later.",
        )

    # Record submission for rate limiting
    feedback_manager.record_submission(x_user_id)

    # Create feedback entry
    feedback = await feedback_manager.create_feedback(
        content=request.content,
        user_id=x_user_id,
    )

    logger.info("Created feedback %s from user %s", feedback.id, x_user_id)

    # Process in background
    background_tasks.add_task(process_feedback, feedback.id)

    return FeedbackResponse(feedback_id=feedback.id)


@router.get("/{feedback_id}", response_model=FeedbackStatusResponse)
async def get_feedback_status(feedback_id: str):
    """Get the current status of a feedback submission."""
    feedback = await feedback_manager.load_feedback(feedback_id)
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")

    return FeedbackStatusResponse(
        feedback_id=feedback.id,
        status=feedback.status.value,
        category=feedback.category.value if feedback.category else None,
        is_actionable=feedback.is_actionable,
        pr_url=feedback.pr_url,
        pr_branch=feedback.pr_branch,
        error=feedback.error,
    )


@router.get("/{feedback_id}/stream")
async def stream_feedback_status(feedback_id: str):
    """Stream real-time updates for a feedback submission via SSE."""
    feedback = await feedback_manager.load_feedback(feedback_id)
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")

    return EventSourceResponse(feedback_manager.sse_generator(feedback_id))
