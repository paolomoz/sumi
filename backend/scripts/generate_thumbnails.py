#!/usr/bin/env python3
"""Batch script to generate style preview thumbnails for all 126 styles.

Iterates through the style catalog and generates a sample thumbnail
for each style using Imagen 4. Results are saved to frontend/public/styles/.

Usage:
    cd backend && python -m scripts.generate_thumbnails
"""

import asyncio
import sys
from pathlib import Path

# Add parent to path so we can import sumi
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sumi.catalog.styles import get_catalog
from sumi.engine.imagen_generator import generate_base_image


OUTPUT_DIR = Path(__file__).resolve().parent.parent.parent / "frontend" / "public" / "styles"
SAMPLE_TOPIC = "technology workflow and innovation process"


async def generate_thumbnail(style, output_dir: Path):
    """Generate a single thumbnail for a style."""
    output_path = output_dir / f"{style.id}.png"
    if output_path.exists():
        print(f"  [SKIP] {style.id} — already exists")
        return

    prompt = (
        f"A beautiful {style.name} style artistic composition depicting {SAMPLE_TOPIC}, "
        f"in the style of {style.description.lower()}, "
        f"with decorative frames, visual sections and ornamental elements, "
        f"rich colors from palette {', '.join(style.color_palette[:3])}, "
        f"no text, no labels, no words, no letters, no writing, "
        f"no captions, no signs, purely visual"
    )

    try:
        await generate_base_image(
            prompt=prompt,
            output_path=str(output_path),
            aspect_ratio="1:1",
        )
        print(f"  [OK] {style.id}")
    except Exception as e:
        print(f"  [FAIL] {style.id}: {e}")


async def main():
    catalog = get_catalog()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print(f"Generating thumbnails for {len(catalog.styles)} styles")
    print(f"Output: {OUTPUT_DIR}\n")

    for i, style in enumerate(catalog.styles):
        print(f"[{i + 1}/{len(catalog.styles)}] {style.name}")
        await generate_thumbnail(style, OUTPUT_DIR)

    print("\nDone!")


if __name__ == "__main__":
    asyncio.run(main())
