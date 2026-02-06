from sumi.llm.client import cerebras_chat
from sumi.references.loader import get_references


SYSTEM_PROMPT = """\
You are a content analysis expert for infographic creation. You apply instructional design \
principles to analyze user topics and produce structured analysis that guides layout and style decisions.

You will be given a detailed analysis framework to follow. Analyze the user's topic thoroughly \
using that framework and return your analysis in markdown format as specified.

Return ONLY the markdown analysis — no wrapping, no extra commentary."""


async def analyze_content(topic: str) -> dict:
    """Analyze user topic using the analysis framework reference.

    Returns a dict with keys: analysis_markdown, layout_signals, style_signals,
    learning_objectives, visual_opportunities, data_type, complexity, title.
    """
    refs = get_references()
    framework = refs.get_framework("analysis-framework")

    user_message = f"""## Analysis Framework

{framework}

---

## Topic to Analyze

{topic}

---

Produce the complete analysis following the framework above. Return the analysis as markdown."""

    analysis_md = await cerebras_chat(
        system=SYSTEM_PROMPT,
        user_message=user_message,
        temperature=0.5,
        max_tokens=4096,
    )

    # Parse key signals from the markdown for downstream pipeline use
    result = {
        "analysis_markdown": analysis_md,
        "topic": topic,
    }

    # Extract structured fields from the analysis markdown
    result["title"] = _extract_field(analysis_md, "title") or topic[:60]
    result["data_type"] = _extract_field(analysis_md, "data_type") or "overview"
    result["complexity"] = _extract_field(analysis_md, "complexity") or "moderate"

    return result


def _extract_field(text: str, field_name: str) -> str | None:
    """Try to extract a YAML front-matter field or inline field from markdown."""
    import re

    # Try YAML front-matter style: field: "value" or field: value
    pattern = rf'{field_name}:\s*"?([^"\n]+)"?'
    match = re.search(pattern, text, re.IGNORECASE)
    if match:
        return match.group(1).strip().strip('"').strip("'")
    return None
