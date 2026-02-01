import json

from sumi.llm.client import chat_json
from sumi.references.loader import get_references


SYSTEM_PROMPT = """\
You are an art director specializing in infographic design. Given content analysis and \
a catalog of available layouts and styles, recommend exactly 3 layout×style combinations.

Your 3 recommendations should represent different approaches:
1. **best_match** — the most appropriate combination for this content type and audience
2. **creative** — a more unexpected, visually striking pairing
3. **accessible** — the broadest appeal, balancing clarity and aesthetics

For each recommendation, return:
- layout_id: the layout ID from the available layouts
- style_id: the style ID from the available styles
- rationale: 1-2 sentences explaining why this combination suits the content
- approach: one of "best_match", "creative", "accessible"

Return a JSON object: {"recommendations": [...]}
Return ONLY valid JSON, no markdown or explanation."""


async def recommend_combinations(
    topic: str,
    analysis: dict,
) -> list[dict]:
    """Recommend 3 layout×style combinations for the given topic and analysis."""
    refs = get_references()
    catalog_summary = refs.summary_for_llm()
    analysis_md = analysis.get("analysis_markdown", topic)

    user_message = f"""Content analysis:
{analysis_md}

---

Available layouts and styles:
{catalog_summary}

---

Recommend 3 layout×style combinations from the options above that best suit the analyzed content."""

    result = await chat_json(
        system=SYSTEM_PROMPT,
        user_message=user_message,
        temperature=0.7,
    )

    recommendations = result.get("recommendations", [])

    # Validate that recommended layouts and styles exist
    valid = []
    for rec in recommendations[:3]:
        layout = refs.get_layout(rec.get("layout_id", ""))
        style = refs.get_style(rec.get("style_id", ""))
        if layout and style:
            rec["layout_name"] = layout.name
            rec["style_name"] = style.name
            valid.append(rec)

    return valid
