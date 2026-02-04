#!/usr/bin/env python3
"""Batch script to generate showcase sample infographics.

Runs the full pipeline (analyze -> structure -> craft prompt -> generate image)
for each sample. Saves images to frontend/public/samples/{index}.jpg and
writes a manifest.json with metadata.

Usage:
    cd backend && python -m scripts.generate_samples
    cd backend && python -m scripts.generate_samples --force
    cd backend && python -m scripts.generate_samples --only 0,3,7
    cd backend && python -m scripts.generate_samples --parallel 4
"""

import argparse
import asyncio
import json
import sys
import time
from pathlib import Path

# Add parent to path so we can import sumi
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sumi.engine.content_analyzer import analyze_content
from sumi.engine.content_structurer import generate_structured_content
from sumi.engine.prompt_crafter import craft_prompt
from sumi.engine.image_generator import generate_image
from sumi.references.loader import get_references

OUTPUT_DIR = Path(__file__).resolve().parent.parent.parent / "frontend" / "public" / "samples"
MANIFEST_PATH = OUTPUT_DIR / "manifest.json"
DELAY_SECONDS = 2

SAMPLES = [
    {"prompt": "How CRISPR Gene Editing Works", "style": "art-nouveau", "layout": "hub-spoke", "aspect": "3:4"},
    {"prompt": "The History of Coffee: From Ethiopia to Your Cup", "style": "storybook-watercolor", "layout": "winding-roadmap", "aspect": "16:9"},
    {"prompt": "Machine Learning Pipeline: From Data to Deployment", "style": "technical-schematic", "layout": "linear-progression", "aspect": "16:9"},
    {"prompt": "The Water Cycle", "style": "kawaii", "layout": "circular-flow", "aspect": "4:3"},
    {"prompt": "Photosynthesis: Nature's Solar Panel", "style": "origami", "layout": "tree-branching", "aspect": "4:3"},
    {"prompt": "The Evolution of Programming Languages: 1950-2024", "style": "pixel-art", "layout": "comic-strip", "aspect": "9:16"},
    {"prompt": "How the Human Immune System Fights Disease", "style": "corporate-memphis", "layout": "bento-grid", "aspect": "16:9"},
    {"prompt": "Space Exploration Milestones", "style": "bold-graphic", "layout": "story-mountain", "aspect": "3:4"},
    {"prompt": "The Science of Sleep", "style": "ukiyo-e", "layout": "hierarchical-layers", "aspect": "3:4"},
    {"prompt": "Agile vs Waterfall: Project Management Compared", "style": "ikea-manual", "layout": "comparison-matrix", "aspect": "16:9"},
    {"prompt": "How Electric Vehicle Batteries Work", "style": "knolling", "layout": "dashboard", "aspect": "4:3"},
    {"prompt": "The Carbon Cycle and Climate Change", "style": "chalkboard", "layout": "iceberg", "aspect": "3:4"},
    {"prompt": "Neural Network Architecture: Layers and Learning", "style": "subway-map", "layout": "funnel", "aspect": "3:4"},
    {"prompt": "The Journey of a Coffee Bean", "style": "craft-handmade", "layout": "bridge", "aspect": "16:9"},
    {"prompt": "World's Major Ocean Currents", "style": "aged-academia", "layout": "isometric-map", "aspect": "4:3"},
    {"prompt": "How Vaccines Train Your Immune System", "style": "claymation", "layout": "venn-diagram", "aspect": "3:4"},
]


async def generate_sample(
    index: int, sample: dict, output_dir: Path, force: bool,
    semaphore: asyncio.Semaphore | None = None,
) -> dict | None:
    """Generate a single showcase sample through the full pipeline. Returns manifest entry or None."""
    tag = f"[{index}]"
    final_path = output_dir / f"{index}.jpg"
    if final_path.exists() and not force:
        print(f"{tag} [SKIP] Already exists")
        return None

    refs = get_references()
    style = refs.get_style(sample["style"])
    layout = refs.get_layout(sample["layout"])
    topic = sample["prompt"]

    if not style:
        print(f"{tag} [FAIL] Style '{sample['style']}' not found")
        return None
    if not layout:
        print(f"{tag} [FAIL] Layout '{sample['layout']}' not found")
        return None

    async def _run():
        print(f"{tag} Analyzing...")
        analysis = await analyze_content(topic)

        print(f"{tag} Structuring...")
        structured_content = await generate_structured_content(topic, analysis)

        print(f"{tag} Crafting prompt...")
        analysis_md = analysis.get("analysis_markdown", "") if isinstance(analysis, dict) else str(analysis)
        prompt = await craft_prompt(
            layout_id=sample["layout"],
            style_id=sample["style"],
            structured_content=structured_content,
            topic=topic,
            analysis=analysis_md,
            aspect_ratio=sample["aspect"],
            language="English",
        )

        print(f"{tag} Generating image...")
        temp_path = str(output_dir / f"{index}.png")
        actual_path = await generate_image(
            prompt=prompt,
            output_path=temp_path,
            aspect_ratio=sample["aspect"],
        )

        # Normalize to .jpg
        actual = Path(actual_path)
        if actual.suffix != ".jpg":
            jpg_path = actual.with_suffix(".jpg")
            actual.rename(jpg_path)

        print(f"{tag} [OK] Saved {index}.jpg")
        return {
            "id": index,
            "prompt": topic,
            "styleId": sample["style"],
            "styleName": style.name,
            "layoutId": sample["layout"],
            "imageUrl": f"/samples/{index}.jpg",
            "aspectRatio": sample["aspect"],
        }

    if semaphore:
        async with semaphore:
            return await _run()
    return await _run()


async def main():
    parser = argparse.ArgumentParser(description="Generate showcase sample infographics")
    parser.add_argument("--force", action="store_true", help="Regenerate existing samples")
    parser.add_argument("--only", type=str, default=None, help="Comma-separated indices to generate (e.g. 0,3,7)")
    parser.add_argument("--parallel", type=int, default=1, help="Number of samples to generate concurrently (default: 1)")
    args = parser.parse_args()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Load existing manifest if present
    manifest = []
    if MANIFEST_PATH.exists():
        manifest = json.loads(MANIFEST_PATH.read_text())

    # Determine which indices to generate
    if args.only is not None:
        indices = [int(x.strip()) for x in args.only.split(",")]
    else:
        indices = list(range(len(SAMPLES)))

    # Filter valid indices
    valid = [(i, SAMPLES[i]) for i in indices if 0 <= i < len(SAMPLES)]

    print(f"Generating {len(valid)} showcase samples (parallel={args.parallel})")
    print(f"Output: {OUTPUT_DIR}")
    if args.force:
        print("Force mode: regenerating existing samples")
    print()

    for i, sample in valid:
        print(f"  [{i}] {sample['prompt']}  —  {sample['style']} / {sample['layout']} / {sample['aspect']}")
    print()

    if args.parallel > 1:
        # Parallel mode: run with semaphore
        semaphore = asyncio.Semaphore(args.parallel)

        async def _task(i: int, sample: dict) -> dict | None:
            try:
                return await generate_sample(i, sample, OUTPUT_DIR, args.force, semaphore)
            except Exception as e:
                print(f"[{i}] [FAIL] {e}")
                return None

        results = await asyncio.gather(*[_task(i, s) for i, s in valid])
        entries = [r for r in results if r is not None]
    else:
        # Sequential mode
        entries = []
        for i, sample in valid:
            try:
                entry = await generate_sample(i, sample, OUTPUT_DIR, args.force)
                if entry:
                    entries.append(entry)
            except Exception as e:
                print(f"[{i}] [FAIL] {e}")
            if entries and i != valid[-1][0]:
                time.sleep(DELAY_SECONDS)

    # Write manifest once at the end
    existing_ids = {e["id"] for e in entries}
    merged = [e for e in manifest if e["id"] not in existing_ids] + entries
    merged.sort(key=lambda e: e["id"])
    MANIFEST_PATH.write_text(json.dumps(merged, indent=2))

    print(f"\nDone! Generated {len(entries)} samples.")
    print(f"Manifest: {MANIFEST_PATH}")


if __name__ == "__main__":
    asyncio.run(main())
