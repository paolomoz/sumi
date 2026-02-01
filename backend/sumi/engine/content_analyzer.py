from sumi.llm.client import chat_json
from sumi.llm.prompts import CONTENT_ANALYSIS_SYSTEM, CONTENT_ANALYSIS_USER


async def analyze_content(topic: str, extra_context: str = "") -> dict:
    """Analyze user topic and extract structured metadata for infographic creation."""
    user_message = CONTENT_ANALYSIS_USER.format(
        topic=topic,
        extra_context=extra_context,
    )
    result = await chat_json(
        system=CONTENT_ANALYSIS_SYSTEM,
        user_message=user_message,
        temperature=0.5,
    )
    # Ensure required fields
    required = ["tone", "complexity", "domain", "audience", "concept_type", "key_concepts"]
    for field in required:
        if field not in result:
            result[field] = "general" if isinstance(field, str) else []

    if "text_labels" not in result:
        result["text_labels"] = result.get("key_concepts", [])
    if "suggested_title" not in result:
        result["suggested_title"] = topic[:60]

    return result
