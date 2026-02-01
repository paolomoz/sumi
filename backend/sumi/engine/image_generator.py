"""Image generation using Gemini 3 Pro Image Preview (multimodal)."""

import base64
from pathlib import Path

from google import genai
from google.genai import types
from tenacity import retry, stop_after_attempt, wait_exponential

from sumi.config import settings


def _get_client() -> genai.Client:
    return genai.Client(api_key=settings.google_api_key)


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=20))
async def generate_image(
    prompt: str,
    output_path: str,
    aspect_ratio: str = "16:9",
) -> str:
    """Generate an infographic image using Gemini 3 Pro Image Preview.

    Returns the path to the saved image file.
    """
    client = _get_client()

    # Gemini multimodal takes aspect ratio as part of the prompt text
    full_prompt = f"{prompt}\n\nAspect ratio: {aspect_ratio}."

    response = await client.aio.models.generate_content(
        model=settings.image_model,
        contents=full_prompt,
        config=types.GenerateContentConfig(
            response_modalities=["IMAGE"],
        ),
    )

    # Extract image from response parts
    for candidate in (response.candidates or []):
        for part in (candidate.content.parts or []):
            if part.inline_data and part.inline_data.data:
                image_bytes = part.inline_data.data
                if isinstance(image_bytes, str):
                    image_bytes = base64.b64decode(image_bytes)

                output = Path(output_path)
                output.parent.mkdir(parents=True, exist_ok=True)
                output.write_bytes(image_bytes)
                return str(output)

    raise RuntimeError("Gemini returned no image in response")
