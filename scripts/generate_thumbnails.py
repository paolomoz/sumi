#!/usr/bin/env python3
"""Generate thumbnails for new styles using the Sumi API."""

import json
import time
import requests
import sys
from pathlib import Path

API_BASE = "http://localhost:8000/api"

# New styles that need thumbnails (style_id -> topic prompt)
NEW_STYLES = {
    "airline-travel-poster": "The Golden Age of Air Travel",
    "art-nouveau-mucha": "The Four Seasons of Life",
    "axonometric": "How a Modern Kitchen Works",
    "botanical-illustration": "Anatomy of a Flowering Plant",
    "cubism": "The Creative Process",
    "daniel-clowes": "A Day in the Life of a Comic Artist",
    "dr-seuss": "The Imagination Machine",
    "fantasy-map": "The Hero's Journey",
    "futurism": "Speed and Motion in Modern Life",
    "golden-age-comics": "The Origin of Superheroes",
    "googie": "The Drive-In Diner Experience",
    "isometric-technical": "Inside a Computer",
    "kandinsky": "The Structure of Music",
    "keith-haring": "The Power of Community",
    "memphis": "The 1980s Design Revolution",
    "osamu-tezuka": "The Birth of Manga",
    "patent-drawing": "The Bicycle: An Engineering Marvel",
    "paul-rand": "The Principles of Logo Design",
    "pop-art-lichtenstein": "The Comic Strip as Art Form",
    "renaissance-diagram": "The Proportions of the Human Body",
    "richard-scarry": "How a Town Works",
    "rinpa": "The Art of Japanese Seasons",
    "saul-bass": "The Anatomy of Suspense",
    "shan-shui": "The Philosophy of Mountain and Water",
    "studio-ghibli": "The Magic of Nature",
    "treasure-map": "The Quest for Hidden Knowledge",
}

def start_generation(topic: str, style_id: str) -> str:
    """Start an infographic generation job and return job_id."""
    response = requests.post(
        f"{API_BASE}/generate",
        json={"topic": topic, "style_id": style_id},
        headers={"Content-Type": "application/json"},
    )
    response.raise_for_status()
    return response.json()["job_id"]

def get_job_status(job_id: str) -> dict:
    """Get the status of a generation job."""
    response = requests.get(f"{API_BASE}/jobs/{job_id}")
    response.raise_for_status()
    return response.json()

def wait_for_completion(job_id: str, max_wait: int = 300) -> dict:
    """Wait for a job to complete and return the final status."""
    start_time = time.time()
    while time.time() - start_time < max_wait:
        status = get_job_status(job_id)
        if status["status"] == "completed":
            return status
        elif status["status"] == "error":
            raise Exception(f"Job failed: {status.get('error', 'Unknown error')}")
        print(f"  Status: {status.get('progress', {}).get('step', 'unknown')}...")
        time.sleep(5)
    raise Exception(f"Job {job_id} timed out after {max_wait} seconds")

def download_image(url: str, output_path: Path):
    """Download an image from a URL to a local file."""
    response = requests.get(url)
    response.raise_for_status()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(response.content)

def main():
    output_dir = Path("/Users/paolo/playground/sumi/frontend/public/styles")
    samples_dir = Path("/Users/paolo/playground/sumi/frontend/public/samples")

    # Track generated samples for showcase-samples.ts
    samples_data = []
    sample_id = 24  # Start after existing samples

    completed = 0
    total = len(NEW_STYLES)

    for style_id, topic in NEW_STYLES.items():
        thumbnail_path = output_dir / f"{style_id}.jpg"

        # Skip if thumbnail already exists
        if thumbnail_path.exists():
            print(f"[{completed+1}/{total}] Skipping {style_id} - thumbnail already exists")
            completed += 1
            sample_id += 1
            continue

        print(f"\n[{completed+1}/{total}] {'='*40}")
        print(f"Style: {style_id}")
        print(f"Topic: {topic}")

        try:
            # Start generation
            job_id = start_generation(topic, style_id)
            print(f"Job: {job_id}")

            # Wait for completion
            status = wait_for_completion(job_id)

            if status["result"] and status["result"]["image_url"]:
                image_url = status["result"]["image_url"]

                # If URL is relative, make it absolute
                if image_url.startswith("/"):
                    image_url = f"http://localhost:8000{image_url}"

                # Download as thumbnail
                download_image(image_url, thumbnail_path)
                print(f"Thumbnail saved: {thumbnail_path.name}")

                # Also save as showcase sample
                sample_path = samples_dir / f"{sample_id}.jpg"
                download_image(image_url, sample_path)
                print(f"Sample saved: {sample_path.name}")

                # Record sample data
                samples_data.append({
                    "id": sample_id,
                    "prompt": topic,
                    "styleId": style_id,
                    "styleName": status["result"].get("style_name", style_id.replace("-", " ").title()),
                    "layoutId": status["result"].get("layout_id", "hub-spoke"),
                    "imageUrl": f"/samples/{sample_id}.jpg",
                    "aspectRatio": "3:4",
                })
                completed += 1
                sample_id += 1
            else:
                print(f"ERROR: No image URL in result for {style_id}")

        except Exception as e:
            print(f"ERROR generating {style_id}: {e}")
            continue

    # Output samples data for manual addition to showcase-samples.ts
    print(f"\n\n{'='*50}")
    print(f"COMPLETED: {completed}/{total} thumbnails generated")
    print(f"{'='*50}")

    if samples_data:
        print("\nSamples data to add to showcase-samples.ts:")
        print("-" * 50)
        for sample in samples_data:
            print(json.dumps(sample, indent=2) + ",")

if __name__ == "__main__":
    main()
