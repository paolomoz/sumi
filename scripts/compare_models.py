#!/usr/bin/env python3
"""Generate comparison images using different fal.ai models."""

import os
import sys
import json
import time
from pathlib import Path
import requests

# Set FAL_KEY before importing fal_client
FAL_API_KEY = "c80ec1f0-f5ce-4df8-8b39-e2cb668531b6:787c5f2845cac506ced3036f9f823c08"
os.environ["FAL_KEY"] = FAL_API_KEY

import fal_client

# Models to compare
MODELS = {
    "recraft-v3": "fal-ai/recraft-v3",
    "flux2": "fal-ai/flux-pro/v1.1",
    "imagineart": "fal-ai/imagineart",
}

# 5 samples to test (diverse styles and topics)
TEST_SAMPLES = [
    {
        "id": 0,
        "prompt": "How CRISPR Gene Editing Works",
        "style": "Art Nouveau",
    },
    {
        "id": 9,
        "prompt": "The Science of Sleep",
        "style": "Ukiyo-e",
    },
    {
        "id": 10,
        "prompt": "Agile vs Waterfall: Project Management Compared",
        "style": "IKEA Manual",
    },
    {
        "id": 50,
        "prompt": "The Migration of Birds",
        "style": "Charley Harper",
    },
    {
        "id": 48,
        "prompt": "The Origin of Superheroes",
        "style": "Golden Age Comics",
    },
]

OUTPUT_DIR = Path(__file__).parent.parent / "frontend" / "public" / "model-comparison"


def build_prompt(sample: dict) -> str:
    """Build a detailed prompt for infographic generation."""
    return f"""Create a beautiful infographic about "{sample['prompt']}" in the {sample['style']} artistic style.

The infographic should:
- Have a clear visual hierarchy with a title at the top
- Include 4-6 key information points with icons or illustrations
- Use the characteristic visual language of {sample['style']} style
- Have readable text labels and annotations
- Be visually cohesive and professionally designed
- Use appropriate colors for the {sample['style']} aesthetic

Make it educational, visually striking, and suitable for sharing."""


def generate_with_model(model_id: str, model_name: str, prompt: str, output_path: Path) -> bool:
    """Generate an image using a specific fal.ai model."""
    try:
        print(f"  Generating with {model_name}...", flush=True)

        # Different models have different parameters
        if "recraft" in model_id:
            result = fal_client.subscribe(
                model_id,
                arguments={
                    "prompt": prompt,
                    "image_size": "portrait_4_3",
                    "style": "digital_illustration",
                },
            )
        elif "flux" in model_id:
            result = fal_client.subscribe(
                model_id,
                arguments={
                    "prompt": prompt,
                    "image_size": "portrait_4_3",
                    "num_images": 1,
                },
            )
        else:  # imagineart
            result = fal_client.subscribe(
                model_id,
                arguments={
                    "prompt": prompt,
                    "aspect_ratio": "3:4",
                },
            )

        # Get the image URL from result
        if result and "images" in result and result["images"]:
            image_url = result["images"][0]["url"]

            # Download the image
            response = requests.get(image_url)
            response.raise_for_status()
            output_path.parent.mkdir(parents=True, exist_ok=True)
            output_path.write_bytes(response.content)
            print(f"    ✓ Saved to {output_path.name}", flush=True)
            return True
        else:
            print(f"    ✗ No image in response: {result}", flush=True)
            return False

    except Exception as e:
        print(f"    ✗ Error: {e}", flush=True)
        return False


def main():
    print("Starting model comparison generation...", flush=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    results = []

    for sample in TEST_SAMPLES:
        print(f"\n[{sample['id']}] {sample['prompt']} ({sample['style']})", flush=True)
        prompt = build_prompt(sample)

        sample_result = {
            "id": sample["id"],
            "prompt": sample["prompt"],
            "style": sample["style"],
            "original": f"/samples/{sample['id']}.jpg",
            "models": {}
        }

        for model_key, model_id in MODELS.items():
            output_path = OUTPUT_DIR / f"{sample['id']}_{model_key}.jpg"

            # Skip if already exists
            if output_path.exists():
                print(f"  [SKIP] {model_key} - already exists", flush=True)
                sample_result["models"][model_key] = f"/model-comparison/{sample['id']}_{model_key}.jpg"
                continue

            success = generate_with_model(model_id, model_key, prompt, output_path)
            if success:
                sample_result["models"][model_key] = f"/model-comparison/{sample['id']}_{model_key}.jpg"

            # Small delay between requests
            time.sleep(2)

        results.append(sample_result)

    # Save results manifest
    manifest_path = OUTPUT_DIR / "manifest.json"
    manifest_path.write_text(json.dumps(results, indent=2))
    print(f"\n✓ Manifest saved to {manifest_path}", flush=True)
    print(f"\nGeneration complete! Results in {OUTPUT_DIR}", flush=True)


if __name__ == "__main__":
    main()
