import base64
import os
from pathlib import Path

import fal_client
from tenacity import retry, stop_after_attempt, wait_exponential

from sumi.config import settings

# FAL client reads FAL_KEY from env
os.environ.setdefault("FAL_KEY", settings.fal_api_key)

FAL_IDEOGRAM_MODEL = "fal-ai/ideogram/v3"


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=30))
async def generate_text_overlay(
    prompt: str,
    style_reference_path: str,
    output_path: str,
    aspect_ratio: str = "9:16",
) -> str:
    """Generate final infographic with text using Ideogram V3 via FAL.

    Uses the Imagen base image as a style reference to maintain visual consistency.
    Returns the path to the saved final image.
    """
    # Read the base image for style reference
    image_bytes = Path(style_reference_path).read_bytes()
    image_b64 = base64.b64encode(image_bytes).decode("utf-8")
    data_url = f"data:image/png;base64,{image_b64}"

    result = await fal_client.run_async(
        FAL_IDEOGRAM_MODEL,
        arguments={
            "prompt": prompt,
            "image_url": data_url,
            "aspect_ratio": aspect_ratio,
            "style_type": "DESIGN",
            "expand_prompt": False,
        },
    )

    # Extract image URL from FAL response
    images = result.get("images", [])
    if not images:
        raise RuntimeError("Ideogram returned no images")

    image_url = images[0].get("url")
    if not image_url:
        raise RuntimeError("Ideogram returned no image URL")

    # Download the image
    import httpx

    async with httpx.AsyncClient() as client:
        resp = await client.get(image_url)
        resp.raise_for_status()

    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(resp.content)

    return str(output)
