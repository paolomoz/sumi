"""Main feedback processing pipeline."""

import logging

from sumi.feedback.models import Feedback, FeedbackStatus
from sumi.feedback.manager import feedback_manager
from sumi.feedback.categorizer import categorize_feedback
from sumi.feedback.code_generator import generate_code_changes
from sumi.feedback.github_integration import create_pr_from_changes, GitHubClient
from sumi.config import settings

logger = logging.getLogger(__name__)


async def process_feedback(feedback_id: str) -> None:
    """Process a feedback submission through the full pipeline.

    Steps:
    1. Categorize the feedback using LLM
    2. If actionable, generate code changes
    3. Create a GitHub PR with the changes
    4. Update feedback status throughout
    """
    feedback = feedback_manager.get_feedback(feedback_id)
    if not feedback:
        logger.error("Feedback not found: %s", feedback_id)
        return

    try:
        # Step 1: Categorize
        await feedback_manager.update_status(feedback_id, FeedbackStatus.CATEGORIZING)
        analysis = await categorize_feedback(feedback.content)
        await feedback_manager.update_analysis(feedback_id, analysis)

        logger.info(
            "Feedback %s categorized: %s, actionable=%s",
            feedback_id,
            analysis.category.value,
            analysis.is_actionable,
        )

        # If not actionable, mark as rejected (with appreciation)
        if not analysis.is_actionable:
            await feedback_manager.update_status(feedback_id, FeedbackStatus.REJECTED)
            logger.info("Feedback %s is not actionable, marking as rejected", feedback_id)
            return

        # Check if GitHub is configured
        client = GitHubClient()
        if not client.is_configured:
            logger.warning("GitHub not configured, skipping PR creation")
            await feedback_manager.update_status(
                feedback_id,
                FeedbackStatus.FAILED,
                error="GitHub integration not configured",
            )
            return

        # Step 2: Generate code changes
        await feedback_manager.update_status(feedback_id, FeedbackStatus.GENERATING)
        changes, pr_title, pr_description = await generate_code_changes(feedback, analysis)

        if not changes:
            logger.warning("No valid code changes generated for %s", feedback_id)
            await feedback_manager.update_status(
                feedback_id,
                FeedbackStatus.FAILED,
                error="Could not generate valid code changes",
            )
            return

        logger.info(
            "Generated %d code changes for %s: %s",
            len(changes),
            feedback_id,
            [c.file_path for c in changes],
        )

        # Store changes on the feedback object for reference
        feedback.code_changes = changes
        feedback.pr_title = pr_title
        feedback.pr_description = pr_description

        # Step 3: Create GitHub PR
        await feedback_manager.update_status(feedback_id, FeedbackStatus.CREATING_PR)
        pr_url, branch_name = await create_pr_from_changes(
            feedback_id=feedback_id,
            changes=changes,
            title=pr_title,
            description=pr_description,
        )

        # Update feedback with PR info
        await feedback_manager.update_pr(feedback_id, pr_url, branch_name)
        await feedback_manager.update_status(feedback_id, FeedbackStatus.COMPLETED)

        logger.info("Feedback %s processed successfully: %s", feedback_id, pr_url)

    except Exception as e:
        logger.exception("Failed to process feedback %s: %s", feedback_id, e)
        await feedback_manager.update_status(
            feedback_id,
            FeedbackStatus.FAILED,
            error=str(e),
        )
