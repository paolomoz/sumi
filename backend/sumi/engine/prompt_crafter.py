import json

from sumi.llm.client import chat_json
from sumi.llm.prompts import PROMPT_CRAFTING_SYSTEM, PROMPT_CRAFTING_USER
from sumi.catalog.styles import get_catalog


async def craft_prompts(
    analysis: dict,
    style_id: str,
    text_labels: list[str] | None = None,
    output_mode: str = "visual",
) -> dict:
    """Create Imagen and Ideogram prompts for the two-stage pipeline."""
    catalog = get_catalog()
    style = catalog.get(style_id)
    if not style:
        raise ValueError(f"Style '{style_id}' not found in catalog")

    guide = catalog.get_guide(style_id)
    if not guide:
        # Generate a minimal guide from catalog metadata
        guide = (
            f"Style: {style.name}\n"
            f"Category: {style.category}\n"
            f"Mood: {', '.join(style.mood)}\n"
            f"Colors: {', '.join(style.color_palette)}\n"
            f"Description: {style.description}\n"
        )

    labels = text_labels or analysis.get("text_labels", [])
    if not labels:
        labels = analysis.get("key_concepts", [])

    user_message = PROMPT_CRAFTING_USER.format(
        analysis_json=json.dumps(analysis, indent=2),
        style_name=style.name,
        style_id=style.id,
        style_guide=guide,
        text_labels=json.dumps(labels),
        output_mode=output_mode,
    )

    result = await chat_json(
        system=PROMPT_CRAFTING_SYSTEM,
        user_message=user_message,
        temperature=0.7,
    )

    # Enforce the critical rule: Imagen prompt must end with the no-text suffix
    no_text_suffix = (
        "no text, no labels, no words, no letters, no writing, "
        "no captions, no signs, purely visual"
    )
    imagen_prompt = result.get("imagen_prompt", "")
    if not imagen_prompt.rstrip().endswith("purely visual"):
        imagen_prompt = imagen_prompt.rstrip().rstrip(",").rstrip(".") + ", " + no_text_suffix
        result["imagen_prompt"] = imagen_prompt

    # Enforce forbidden words in Imagen prompt
    forbidden = ["infographic", "diagram", "educational", "chart", "annotated"]
    for word in forbidden:
        if word.lower() in result["imagen_prompt"].lower():
            result["imagen_prompt"] = result["imagen_prompt"].replace(word, "illustration")
            result["imagen_prompt"] = result["imagen_prompt"].replace(
                word.capitalize(), "Illustration"
            )

    return result
