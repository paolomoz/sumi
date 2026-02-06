from sumi.llm.client import chat
from sumi.references.loader import get_references


SYSTEM_PROMPT = """\
You are an expert instructional designer transforming content analysis into structured, \
designer-ready infographic content. Follow the structured content template precisely.

Your output must be pure markdown following the template format. Include specific text labels \
for every section — these will be rendered verbatim in the final infographic.

Return ONLY the structured content markdown — no wrapping, no extra commentary."""


async def generate_structured_content(topic: str, analysis: dict) -> str:
    """Transform analysis into designer-ready structured content.

    Returns the structured content as a markdown string.
    """
    refs = get_references()
    template = refs.get_framework("structured-content-template")
    analysis_md = analysis.get("analysis_markdown", topic)

    # Use structured system blocks with prompt caching for the template
    system = [
        {"type": "text", "text": SYSTEM_PROMPT},
        {"type": "text", "text": template, "cache_control": {"type": "ephemeral"}},
    ]

    user_message = f"""## Content Analysis

{analysis_md}

---

## Original Topic

{topic}

---

Generate the structured content following the template in the system prompt. Include all text labels \
that should appear in the infographic. Preserve all data points verbatim from the analysis."""

    structured_content = await chat(
        system=system,
        user_message=user_message,
        temperature=0.5,
        max_tokens=4096,
    )

    return structured_content
