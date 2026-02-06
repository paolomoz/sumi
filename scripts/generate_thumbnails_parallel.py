#!/usr/bin/env python3
"""Generate thumbnails for new styles using the Sumi API - PARALLEL VERSION."""

import json
import time
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from threading import Lock

API_BASE = "http://localhost:8000/api"
MAX_WORKERS = 1  # Number of parallel generations

# New styles that need thumbnails (style_id -> topic prompt)
NEW_STYLES = {
    "charley-harper": "The Migration of Birds",
    "constructivism": "The Power of Industrial Progress",
    "de-stijl": "The Language of Color and Form",
    "dia-de-muertos": "Celebrating Life and Death",
    "isotype": "Global Population Growth",
    "jack-kirby": "The Cosmic Eternal Beings",
    "ligne-claire": "The Adventures of a Young Reporter",
    "moebius": "Journey Across the Crystal Desert",
    "superflat": "A Garden of Smiling Flowers",
    "synthwave": "The Neon City at Midnight",
    "tibetan-thangka": "The Medicine Buddha Mandala",
}

print_lock = Lock()
sample_id_lock = Lock()
current_sample_id = 50

def log(msg):
    with print_lock:
        print(msg, flush=True)

def start_generation(topic: str, style_id: str) -> str:
    response = requests.post(
        f"{API_BASE}/generate",
        json={"topic": topic, "style_id": style_id},
        headers={"Content-Type": "application/json"},
    )
    response.raise_for_status()
    return response.json()["job_id"]

def get_job_status(job_id: str) -> dict:
    response = requests.get(f"{API_BASE}/jobs/{job_id}")
    response.raise_for_status()
    return response.json()

def confirm_selection(job_id: str, style_id: str, layout_id: str) -> bool:
    """Confirm style/layout selection to proceed with generation."""
    response = requests.post(
        f"{API_BASE}/jobs/{job_id}/confirm",
        json={"style_id": style_id, "layout_id": layout_id},
        headers={"Content-Type": "application/json"},
    )
    return response.status_code == 200

def wait_for_completion(job_id: str, style_id: str, max_wait: int = 300) -> dict:
    start_time = time.time()
    last_step = ""
    confirmed = False
    while time.time() - start_time < max_wait:
        status = get_job_status(job_id)
        step = status.get("progress", {}).get("step", "unknown")
        if step != last_step:
            log(f"  [{style_id}] {step}")
            last_step = step

        # Auto-confirm when awaiting selection
        if status["status"] == "awaiting_selection" and not confirmed:
            # Get the recommended layout for this style
            recs = status.get("step_data", {}).get("recommending", {}).get("recommendations", [])
            layout_id = "bento-grid"  # default
            for rec in recs:
                if rec.get("style_id") == style_id:
                    layout_id = rec.get("layout_id", layout_id)
                    break
            else:
                if recs:
                    layout_id = recs[0].get("layout_id", layout_id)

            log(f"  [{style_id}] confirming selection: {style_id} + {layout_id}")
            if confirm_selection(job_id, style_id, layout_id):
                confirmed = True
            time.sleep(1)
            continue

        if status["status"] == "completed":
            return status
        elif status["status"] in ("error", "failed"):
            raise Exception(f"Job failed: {status.get('error', 'Unknown error')}")
        time.sleep(3)
    raise Exception(f"Job {job_id} timed out after {max_wait} seconds")

def download_image(url: str, output_path: Path):
    response = requests.get(url)
    response.raise_for_status()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(response.content)

def generate_style(style_id: str, topic: str, output_dir: Path, samples_dir: Path):
    global current_sample_id

    thumbnail_path = output_dir / f"{style_id}.jpg"

    if thumbnail_path.exists():
        log(f"[SKIP] {style_id} - already exists")
        return None

    log(f"[START] {style_id}: {topic}")

    try:
        job_id = start_generation(topic, style_id)
        log(f"  [{style_id}] job: {job_id}")

        status = wait_for_completion(job_id, style_id)

        if status["result"] and status["result"]["image_url"]:
            image_url = status["result"]["image_url"]
            if image_url.startswith("/"):
                image_url = f"http://localhost:8000{image_url}"

            download_image(image_url, thumbnail_path)
            log(f"[DONE] {style_id} -> {thumbnail_path.name}")

            # Get unique sample ID
            with sample_id_lock:
                sample_id = current_sample_id
                current_sample_id += 1

            sample_path = samples_dir / f"{sample_id}.jpg"
            download_image(image_url, sample_path)

            return {
                "id": sample_id,
                "prompt": topic,
                "styleId": style_id,
                "styleName": status["result"].get("style_name", style_id.replace("-", " ").title()),
                "layoutId": status["result"].get("layout_id", "hub-spoke"),
                "imageUrl": f"/samples/{sample_id}.jpg",
                "aspectRatio": "3:4",
            }
        else:
            log(f"[ERROR] {style_id}: No image URL")
            return None

    except Exception as e:
        log(f"[ERROR] {style_id}: {e}")
        return None

def main():
    output_dir = Path("/Users/paolo/playground/sumi/frontend/public/styles")
    samples_dir = Path("/Users/paolo/playground/sumi/frontend/public/samples")

    # Find styles that still need thumbnails
    pending_styles = {
        style_id: topic
        for style_id, topic in NEW_STYLES.items()
        if not (output_dir / f"{style_id}.jpg").exists()
    }

    log(f"Generating {len(pending_styles)} thumbnails with {MAX_WORKERS} parallel workers...")
    log(f"Styles: {', '.join(pending_styles.keys())}")
    log("")

    samples_data = []

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {
            executor.submit(generate_style, style_id, topic, output_dir, samples_dir): style_id
            for style_id, topic in pending_styles.items()
        }

        for future in as_completed(futures):
            style_id = futures[future]
            try:
                result = future.result()
                if result:
                    samples_data.append(result)
            except Exception as e:
                log(f"[EXCEPTION] {style_id}: {e}")

    log(f"\n{'='*50}")
    log(f"COMPLETED: {len(samples_data)} thumbnails generated")
    log(f"{'='*50}")

    if samples_data:
        samples_data.sort(key=lambda x: x["id"])
        log("\nSamples data for showcase-samples.ts:")
        log("-" * 50)
        for sample in samples_data:
            log(json.dumps(sample, indent=2) + ",")

if __name__ == "__main__":
    main()
