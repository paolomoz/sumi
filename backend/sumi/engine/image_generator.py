"""Single-stage image generation using Google Imagen 4."""

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
    aspect_ratio: str = "9:16",
) -> str:
    """Generate an infographic image using Google Imagen 4.

    Returns the path to the saved image file.
    """
    client = _get_client()

    response = await client.aio.models.generate_images(
        model=settings.imagen_model,
        prompt=prompt,
        config=types.GenerateImagesConfig(
            number_of_images=1,
            aspect_ratio=aspect_ratio,
            safety_filter_level="BLOCK_LOW_AND_ABOVE",
        ),
    )

    if not response.generated_images:
        raise RuntimeError("Imagen returned no images")

    image = response.generated_images[0]
    image_bytes = image.image.image_bytes

    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(image_bytes)

    return str(output)
