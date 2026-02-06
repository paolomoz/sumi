"""Pre-synthesis step for long content.

When users paste very long documents (>10K chars), this module condenses
the raw input into a structured brief that downstream pipeline steps
can work with effectively. Short inputs pass through unchanged.
"""

import logging

from sumi.llm.client import cerebras_chat

logger = logging.getLogger(__name__)

SYNTHESIS_THRESHOLD = 10_000  # chars — below this, skip synthesis

SYSTEM_PROMPT = """\
You are a content strategist preparing source material for infographic creation. \
You will receive a long document and must distill it into a structured brief \
that captures everything needed to create a compelling infographic.

Your output must preserve:
- All key data points, statistics, and numbers VERBATIM
- Important quotes (exact wording)
- The core narrative arc or argument
- Hierarchical structure (main themes → sub-themes)

Your output must be concise (under 3000 words) and structured as markdown.

Return ONLY the structured brief — no wrapping, no commentary about the process."""


async def synthesize_if_needed(topic: str) -> str:
    """Condense long content into a structured brief.

    For topics under SYNTHESIS_THRESHOLD characters, returns the input unchanged.
    For longer content, uses Claude to extract and structure the key information.
    """
    if len(topic) <= SYNTHESIS_THRESHOLD:
        return topic

    logger.info(
        "Topic is %d chars (threshold: %d) — running pre-synthesis",
        len(topic),
        SYNTHESIS_THRESHOLD,
    )

    user_message = f"""Distill the following document into a structured brief for infographic creation.

## Source Document ({len(topic):,} characters)

{topic}

---

Create a structured brief with these sections:

### Title & Core Message
The single most important takeaway.

### Key Themes
The 3-7 main themes or topics, each with a one-sentence summary.

### Critical Data Points
All numbers, statistics, dates, metrics — preserved verbatim.

### Structure & Relationships
How the themes connect: hierarchy, sequence, cause-effect, comparison.

### Notable Quotes & Highlights
Important phrases worth featuring in the infographic, preserved verbatim.

### Audience & Tone
Who this is for and what tone the infographic should strike."""

    brief = await cerebras_chat(
        system=SYSTEM_PROMPT,
        user_message=user_message,
        temperature=0.3,
        max_tokens=4096,
    )

    logger.info(
        "Pre-synthesis complete: %d chars → %d chars (%.0f%% reduction)",
        len(topic),
        len(brief),
        (1 - len(brief) / len(topic)) * 100,
    )

    return brief
