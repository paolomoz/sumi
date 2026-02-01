"""Pure template substitution prompt crafter — no LLM call needed."""

import re

from sumi.references.loader import get_references


def craft_prompt(
    layout_id: str,
    style_id: str,
    structured_content: str,
    text_labels: list[str] | None = None,
    aspect_ratio: str = "9:16",
    language: str = "English",
) -> str:
    """Build the final image generation prompt via template substitution.

    Uses base-prompt.md as the template with placeholder replacement.
    This is a synchronous function — no async/LLM needed.
    """
    refs = get_references()
    template = refs.get_framework("base-prompt")

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
        # Extract labels from structured content (lines starting with - Headline/Label)
        labels_text = _extract_labels_from_content(structured_content)

    # Perform template substitution
    prompt = template
    prompt = prompt.replace("{{LAYOUT}}", layout.name)
    prompt = prompt.replace("{{STYLE}}", style.name)
    prompt = prompt.replace("{{LAYOUT_GUIDELINES}}", layout.content)
    prompt = prompt.replace("{{STYLE_GUIDELINES}}", style.content)
    prompt = prompt.replace("{{CONTENT}}", structured_content)
    prompt = prompt.replace("{{TEXT_LABELS}}", labels_text)
    prompt = prompt.replace("{{ASPECT_RATIO}}", aspect_ratio)
    prompt = prompt.replace("{{LANGUAGE}}", language)

    return prompt


def _extract_labels_from_content(content: str) -> str:
    """Extract text labels from structured content markdown."""
    labels = []
    for line in content.split("\n"):
        stripped = line.strip()
        # Match lines like: - Headline: "Some text"
        # or - Labels: "Label 1", "Label 2"
        if any(
            stripped.startswith(f"- {prefix}:")
            for prefix in ("Headline", "Subhead", "Labels", "Label", "Main number", "Action")
        ):
            # Extract quoted strings
            quoted = re.findall(r'"([^"]+)"', stripped)
            labels.extend(quoted)
    if not labels:
        return "(derive text labels from the content above)"
    return "\n".join(f"- {label}" for label in labels)
