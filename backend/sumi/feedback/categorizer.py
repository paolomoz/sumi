"""LLM-based feedback categorization."""

import logging

from sumi.llm.client import chat_json
from sumi.feedback.models import FeedbackCategory, LLMAnalysis

logger = logging.getLogger(__name__)

CATEGORIZATION_SYSTEM = """You are a feedback analyzer for a web application called Sumi that generates infographics from text.

Your job is to analyze user feedback and categorize it. You must determine:
1. The category of feedback
2. Whether it's actionable (can be addressed with code changes)
3. A brief summary suitable for a PR title
4. Which areas of the codebase might be affected

Categories:
- bug: Something is broken or not working as expected
- feature_request: A request for new functionality
- improvement: A suggestion to make existing functionality better
- thank_you: Positive feedback or appreciation (NOT actionable)
- question: A question about how to use the app (NOT actionable)
- other: Doesn't fit other categories

Actionable feedback is feedback that could result in code changes to improve the application.
- Bug reports are actionable if they describe a specific issue
- Feature requests are actionable if they're reasonable in scope
- Improvements are actionable if they're specific enough to implement
- Thank you messages, questions, and vague feedback are NOT actionable

Affected areas (pick relevant ones):
- frontend/components: UI components (React/TypeScript)
- frontend/styles: CSS, Tailwind styling
- frontend/pages: Page-level components and routing
- backend/api: API endpoints (FastAPI)
- backend/llm: LLM integration (Claude/Gemini)
- backend/jobs: Job processing pipeline
- backend/db: Database operations

Respond with a JSON object in this exact format:
{
  "category": "bug|feature_request|improvement|thank_you|question|other",
  "is_actionable": true|false,
  "summary": "Brief summary for PR title (max 60 chars)",
  "affected_areas": ["frontend/components", "backend/api"],
  "reasoning": "Brief explanation of your categorization"
}"""


async def categorize_feedback(content: str) -> LLMAnalysis:
    """Categorize feedback using the LLM."""
    logger.info("Categorizing feedback: %s...", content[:50])

    user_message = f"""Analyze this user feedback:

---
{content}
---

Respond with a JSON object containing category, is_actionable, summary, affected_areas, and reasoning."""

    try:
        result = await chat_json(
            system=CATEGORIZATION_SYSTEM,
            user_message=user_message,
            temperature=0.3,
            max_tokens=500,
        )

        category_str = result.get("category", "other")
        try:
            category = FeedbackCategory(category_str)
        except ValueError:
            category = FeedbackCategory.OTHER

        return LLMAnalysis(
            category=category,
            is_actionable=bool(result.get("is_actionable", False)),
            summary=result.get("summary", "User feedback")[:60],
            affected_areas=result.get("affected_areas", []),
            reasoning=result.get("reasoning", ""),
        )

    except Exception as e:
        logger.exception("Failed to categorize feedback: %s", e)
        return LLMAnalysis(
            category=FeedbackCategory.OTHER,
            is_actionable=False,
            summary="User feedback",
            affected_areas=[],
            reasoning=f"Categorization failed: {e}",
        )
