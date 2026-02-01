"""LLM-assisted prompt crafter — generates rich, visually-specific image prompts."""

import re

from sumi.llm.client import chat
from sumi.references.loader import get_references


SYSTEM_PROMPT = """\
You are an expert visual designer crafting prompts for an AI image generator (Imagen 4). \
You will be given a layout reference, style reference, original source material, content analysis, \
and structured content. Your job is to produce THREE sections of a prompt:

1. **Layout Guidelines** — Adapt the generic layout structure to this specific content. \
Replace placeholders with content-specific descriptions.

2. **Style Guidelines** — Include the full style description plus:
   - Color Palette with specific usage instructions
   - Visual Elements list
   - A Compositional Patterns table mapping content structures to style-specific compositions
   - Visual Metaphor Mappings that translate each content section into a concrete, style-specific visual scene
   - Typography instructions

3. **Content** — Describe each content section as a VISUAL SCENE. \
Each section must have a descriptive title and a vivid description of what to draw — \
objects, characters, spatial layout, colors, mood, and the exact text to render. \
End with a separate "Text Labels" subsection organizing ALL text by area.

## CRITICAL RULES

- Describe VISUAL SCENES, not abstract concepts. Tell the image generator what to DRAW.
- Every content section needs: a scene name, visual description, and exact text labels.
- Visual metaphor mappings must be SPECIFIC to the content and style (e.g., for ukiyo-e: \
"Trust Signals → guardian komainu statues or a samurai standing watch").
- Keep all source quotes and data VERBATIM — never summarize or rephrase.
- Output raw markdown with NO code fences, NO preamble, NO commentary.
- Start your output directly with "## Layout Guidelines"."""


async def craft_prompt(
    layout_id: str,
    style_id: str,
    structured_content: str,
    topic: str = "",
    analysis: str = "",
    text_labels: list[str] | None = None,
    aspect_ratio: str = "16:9",
    language: str = "English",
) -> str:
    """Build the final image generation prompt using Claude for creative synthesis.

    The fixed header is minimal (one line). Claude generates the creative sections
    (Layout Guidelines, Style Guidelines with visual metaphors, Content as visual scenes)
    using the full topic + analysis + structured content as context.
    """
    refs = get_references()

    layout = refs.get_layout(layout_id)
    style = refs.get_style(style_id)

    if not layout:
        raise ValueError(f"Layout '{layout_id}' not found in references")
    if not style:
        raise ValueError(f"Style '{style_id}' not found in references")

    # Format text labels
    if text_labels:
        labels_text = "\n".join(f"- {label}" for label in text_labels)
    else:
        labels_text = _extract_labels_from_content(structured_content)

    # --- Fixed header (minimal — avoid verbose text that Imagen renders) ---
    fixed_header = f"""Create a single {aspect_ratio} infographic in {style.name} style using a {layout.name} layout. All text in {language}. Use rich visual scenes with clear hierarchy and ample whitespace.
"""

    # --- Build context block from topic + analysis ---
    context_block = ""
    if topic:
        context_block += f"""## Original Source Material

{topic}

"""
    if analysis:
        context_block += f"""## Content Analysis

{analysis}

"""

    # --- LLM-generated creative sections ---
    user_message = f"""Generate the creative sections of an infographic prompt.

## Parameters
- **Layout**: {layout.name} (`{layout_id}`)
- **Style**: {style.name} (`{style_id}`)
- **Aspect Ratio**: {aspect_ratio}
- **Language**: {language}

{context_block}## Layout Reference (adapt this for the specific content)

{layout.content}

## Style Reference (include color palette, compositional patterns, visual metaphors)

{style.content}

## Structured Content (transform into visual scenes)

{structured_content}

## Extracted Text Labels (organize by area in your output)

{labels_text}

---

Generate exactly three sections:

## Layout Guidelines
Customize the layout structure for THIS content. Name specific nodes/sections.

## Style Guidelines
Include full color palette, visual elements, compositional patterns table, \
visual metaphor mappings (map each content section to a style-specific visual scene), \
and typography instructions.

---

## Content

Generate the infographic based on the following structured content:

(Then describe each section as a named visual scene with: title, visual description, and text labels. \
For example: "### CENTER HUB: The Castle\\nA grand Japanese castle at the center, representing X. \
Surrounded by stylized waves and clouds. Below: \\"Quote text\\" on a scroll banner.")

End with:

---

## Text Labels (in {language})

(Organize ALL text that should appear in the infographic, grouped by area: \
Title, Hub/Center, Section Labels, Section Content, Key Phrases, Attribution.)"""

    creative_sections = await chat(
        system=SYSTEM_PROMPT,
        user_message=user_message,
        temperature=0.7,
        max_tokens=8192,
    )

    # Assemble final prompt: fixed header + creative sections
    prompt = fixed_header.rstrip() + "\n\n" + creative_sections.strip() + "\n"

    return prompt


def _extract_labels_from_content(content: str) -> str:
    """Extract text labels from structured content markdown."""
    labels = []
    for line in content.split("\n"):
        stripped = line.strip()
        if any(
            stripped.startswith(f"- {prefix}:")
            for prefix in ("Headline", "Subhead", "Labels", "Label", "Main number", "Action")
        ):
            quoted = re.findall(r'"([^"]+)"', stripped)
            labels.extend(quoted)
    if not labels:
        return "(derive text labels from the content above)"
    return "\n".join(f"- {label}" for label in labels)
