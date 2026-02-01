import json

from sumi.llm.client import chat_json
from sumi.llm.prompts import STYLE_RECOMMENDATION_SYSTEM, STYLE_RECOMMENDATION_USER
from sumi.catalog.styles import get_catalog
from sumi.engine.content_analyzer import analyze_content


async def recommend_styles(
    topic: str,
    analysis: dict | None = None,
) -> list[dict]:
    """Recommend 3 artistic styles for the given topic."""
    if analysis is None:
        analysis = await analyze_content(topic)

    catalog = get_catalog()
    catalog_summary = catalog.summary_for_llm()

    user_message = STYLE_RECOMMENDATION_USER.format(
        analysis_json=json.dumps(analysis, indent=2),
        catalog_summary=catalog_summary,
    )
    result = await chat_json(
        system=STYLE_RECOMMENDATION_SYSTEM,
        user_message=user_message,
        temperature=0.7,
    )

    recommendations = result.get("recommendations", [])

    # Validate that recommended styles exist in catalog
    valid = []
    for rec in recommendations[:3]:
        style = catalog.get(rec.get("style_id", ""))
        if style:
            rec["style_name"] = style.name
            valid.append(rec)

    return valid
