#!/usr/bin/env python3
"""Batch script to generate style preview thumbnails for all styles.

Iterates through the style catalog and generates a sample thumbnail
for each style using Gemini. Results are saved to frontend/public/styles/.

Usage:
    cd backend && python -m scripts.generate_thumbnails
    cd backend && python -m scripts.generate_thumbnails --force
"""

import argparse
import asyncio
import sys
import time
from pathlib import Path

# Add parent to path so we can import sumi
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sumi.references.loader import get_references
from sumi.engine.image_generator import generate_image


OUTPUT_DIR = Path(__file__).resolve().parent.parent.parent / "frontend" / "public" / "styles"
FIXED_TOPIC = "What is Sumi — the infographic generator"
DELAY_SECONDS = 2


def build_prompt(style) -> str:
    """Build a thumbnail generation prompt from a style's markdown content."""
    return (
        f"Create a beautiful infographic preview in the {style.name} style about: {FIXED_TOPIC}.\n\n"
        f"Style reference:\n{style.content}\n\n"
        f"Make it visually rich with the style's color palette, typography, and visual elements. "
        f"This should look like a real infographic thumbnail preview."
    )


async def generate_thumbnail(style, output_dir: Path, force: bool) -> bool:
    """Generate a single thumbnail for a style. Returns True if generated."""
    final_path = output_dir / f"{style.id}.jpg"
    if final_path.exists() and not force:
        print(f"  [SKIP] {style.id} — already exists")
        return False

    prompt = build_prompt(style)
    temp_path = str(output_dir / f"{style.id}.png")

    try:
        actual_path = await generate_image(
            prompt=prompt,
            output_path=temp_path,
            aspect_ratio="4:3",
        )

        # Normalize to .jpg
        actual = Path(actual_path)
        if actual.suffix != ".jpg":
            jpg_path = actual.with_suffix(".jpg")
            actual.rename(jpg_path)

        print(f"  [OK] {style.id}")
        return True
    except Exception as e:
        print(f"  [FAIL] {style.id}: {e}")
        return False


async def main():
    parser = argparse.ArgumentParser(description="Generate style preview thumbnails")
    parser.add_argument("--force", action="store_true", help="Regenerate existing thumbnails")
    args = parser.parse_args()

    refs = get_references()
    styles = refs.list_styles()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print(f"Generating thumbnails for {len(styles)} styles")
    print(f"Output: {OUTPUT_DIR}")
    if args.force:
        print("Force mode: regenerating all thumbnails")
    print()

    generated = 0
    for i, style in enumerate(styles):
        print(f"[{i + 1}/{len(styles)}] {style.name}")
        was_generated = await generate_thumbnail(style, OUTPUT_DIR, args.force)
        if was_generated and i < len(styles) - 1:
            generated += 1
            time.sleep(DELAY_SECONDS)

    print(f"\nDone! Generated {generated} thumbnails.")


if __name__ == "__main__":
    asyncio.run(main())
