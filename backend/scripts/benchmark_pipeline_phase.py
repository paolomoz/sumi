"""Pipeline Phase Benchmark: runs the full pipeline for before/after comparison.

Runs 3 fixed topics through the full pipeline (excluding user selection),
saves images + timings, and generates a manifest.json for the comparison page.

Usage:
    cd backend && .venv/bin/python -m scripts.benchmark_pipeline_phase \
        --phase phase-1 --label "Remove Recommendations" --tag before

    # ... implement changes ...

    cd backend && .venv/bin/python -m scripts.benchmark_pipeline_phase \
        --phase phase-1 --label "Remove Recommendations" --tag after
"""

import argparse
import asyncio
import json
import os
import sys
import time
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sumi.config import settings
from sumi.engine.content_synthesizer import synthesize_if_needed
from sumi.engine.content_analyzer import analyze_content
from sumi.engine.content_structurer import generate_structured_content
from sumi.engine.prompt_crafter import craft_prompt
from sumi.engine.image_generator import generate_image
from sumi.references.loader import get_references

# ---------------------------------------------------------------------------
# Load .env
# ---------------------------------------------------------------------------
_env_path = Path(__file__).resolve().parent.parent.parent / ".env"
if _env_path.exists():
    for _line in _env_path.read_text().splitlines():
        _line = _line.strip()
        if _line and not _line.startswith("#") and "=" in _line:
            _k, _, _v = _line.partition("=")
            os.environ.setdefault(_k.strip(), _v.strip())

# ---------------------------------------------------------------------------
# Test topics (same as benchmark_llm_providers.py)
# ---------------------------------------------------------------------------

TOPIC_SHORT = "How coffee is made — from bean to cup"

TOPIC_MEDIUM = """\
Space exploration has been one of humanity's most ambitious endeavors since the \
mid-20th century. Beginning with the launch of Sputnik in 1957, the space race \
between the United States and the Soviet Union drove rapid technological \
advancement. The Apollo missions culminated in the first human Moon landing in \
1969, marking a defining moment in human history.

In the decades that followed, space agencies shifted focus to long-duration \
orbital missions, reusable launch vehicles, and international cooperation through \
the International Space Station. The ISS has served as a continuous human \
presence in low Earth orbit since 2000, enabling groundbreaking research in \
microgravity physics, materials science, and human physiology.

Today, space exploration is entering a transformative era driven by both \
government agencies and private companies. SpaceX, Blue Origin, and other \
commercial firms have dramatically reduced launch costs through reusable rocket \
technology. NASA's Artemis program aims to establish a sustainable human presence \
on the Moon, while Mars remains the ultimate long-term destination for crewed \
exploration.

Key challenges include radiation shielding, closed-loop life support systems, the \
psychological effects of long-duration isolation, and the enormous cost of \
interplanetary travel. Despite these obstacles, advances in electric propulsion, \
AI-guided autonomous navigation, and in-situ resource utilization continue to \
push the boundaries of what's possible beyond Earth's atmosphere."""

TOPIC_LONG = """\
# Climate Change: Impacts, Mitigation Strategies, and Adaptation

Climate change represents the defining challenge of the 21st century, affecting \
every nation, ecosystem, and economic sector on Earth. The scientific evidence is \
overwhelming: human activities, particularly the burning of fossil fuels, are \
driving unprecedented changes in global climate systems with far-reaching \
consequences.

## The Science Behind Climate Change

The greenhouse effect is a natural process essential for life on Earth. Solar \
radiation passes through the atmosphere, warming the planet's surface, which then \
re-emits energy as infrared radiation. Greenhouse gases — including carbon \
dioxide, methane, nitrous oxide, and water vapor — absorb and re-emit this \
infrared radiation, maintaining temperatures approximately 33°C warmer than they \
would otherwise be.

Human activities have dramatically amplified this natural process. Since the \
Industrial Revolution, atmospheric CO₂ concentrations have risen from \
approximately 280 parts per million to over 420 ppm — the highest level in at \
least 800,000 years of ice core records. The IPCC reports that global average \
surface temperature has increased by approximately 1.1°C above pre-industrial levels.

## Environmental Impacts

Rising global temperatures are driving measurable changes across Earth's physical \
systems. Arctic sea ice extent has declined by approximately 13% per decade since \
satellite monitoring began in 1979. Mountain glaciers worldwide are retreating at \
accelerating rates. Global mean sea level has risen approximately 20 centimeters \
since 1900, with the rate of rise doubling in recent decades.

Extreme weather events have intensified in both frequency and severity. Heat \
waves have become longer, more frequent, and more intense. Tropical cyclones are \
reaching higher peak intensities. Marine ecosystems face the dual threats of \
warming and acidification.

## Mitigation Strategies

The Paris Agreement established the international framework for climate \
mitigation. Renewable energy technologies have experienced dramatic cost \
reductions of 85–90% over the past decade. Electric vehicle adoption is \
accelerating rapidly, with global sales exceeding 14 million units in 2023.

Nature-based solutions complement technological mitigation approaches. \
Reforestation, afforestation, and improved forest management can sequester \
significant quantities of CO₂ while providing biodiversity co-benefits.

## The Path Forward

The choices made in this decade will largely determine the trajectory of climate \
change for centuries to come. Global CO₂ emissions must decline by approximately \
45% from 2010 levels by 2030 and reach net zero by 2050."""

TOPICS = {
    "short": {"name": "Coffee - Short", "topic": TOPIC_SHORT},
    "medium": {"name": "Space - Medium", "topic": TOPIC_MEDIUM},
    "long": {"name": "Climate - Long", "topic": TOPIC_LONG},
}

# Fixed style/layout to eliminate variability
FIXED_LAYOUT_ID = "hub-spoke"
FIXED_STYLE_ID = "ukiyo-e"


async def run_pipeline_for_topic(topic_key: str, topic_text: str, output_dir: Path) -> dict:
    """Run the full pipeline for one topic, return timings and image path."""
    output_dir.mkdir(parents=True, exist_ok=True)
    timings: dict[str, float] = {}

    print(f"  [{topic_key}] Pre-synthesis...")
    t0 = time.monotonic()
    topic = await synthesize_if_needed(topic_text)
    timings["pre_synthesis"] = round(time.monotonic() - t0, 2)

    print(f"  [{topic_key}] Analyzing...")
    t0 = time.monotonic()
    analysis = await analyze_content(topic)
    timings["analysis"] = round(time.monotonic() - t0, 2)

    # Save analysis
    analysis_md = analysis.get("analysis_markdown", "")
    (output_dir / "analysis.md").write_text(analysis_md, encoding="utf-8")

    print(f"  [{topic_key}] Structuring...")
    t0 = time.monotonic()
    structured = await generate_structured_content(topic, analysis)
    timings["structuring"] = round(time.monotonic() - t0, 2)

    # Save structured content
    (output_dir / "structured_content.md").write_text(structured, encoding="utf-8")

    print(f"  [{topic_key}] Crafting prompt...")
    t0 = time.monotonic()
    analysis_md_str = analysis.get("analysis_markdown", "") if isinstance(analysis, dict) else str(analysis)
    prompt = await craft_prompt(
        layout_id=FIXED_LAYOUT_ID,
        style_id=FIXED_STYLE_ID,
        structured_content=structured,
        topic=topic,
        analysis=analysis_md_str,
        aspect_ratio="16:9",
        language="English",
    )
    timings["crafting"] = round(time.monotonic() - t0, 2)

    # Save prompt
    (output_dir / "prompt.md").write_text(prompt, encoding="utf-8")

    print(f"  [{topic_key}] Generating image...")
    t0 = time.monotonic()
    image_path = str(output_dir / "infographic.png")
    actual_path = await generate_image(
        prompt=prompt,
        output_path=image_path,
        aspect_ratio="16:9",
    )
    timings["image_generation"] = round(time.monotonic() - t0, 2)

    total = round(sum(timings.values()), 2)
    timings["total"] = total
    print(f"  [{topic_key}] Done in {total:.1f}s")

    # Save timings
    (output_dir / "timings.json").write_text(json.dumps(timings, indent=2), encoding="utf-8")

    return {
        "timings": timings,
        "total_time": total,
        "image": str(Path(actual_path).relative_to(Path(settings.output_dir).parent)),
    }


async def main():
    parser = argparse.ArgumentParser(description="Pipeline phase benchmark")
    parser.add_argument("--phase", required=True, help="Phase identifier (e.g., phase-1)")
    parser.add_argument("--label", required=True, help="Human-readable phase label")
    parser.add_argument("--tag", required=True, choices=["before", "after"], help="before or after")
    args = parser.parse_args()

    base_dir = Path(settings.output_dir) / "pipeline-comparison" / args.phase / args.tag
    base_dir.mkdir(parents=True, exist_ok=True)

    print(f"\n{'='*60}")
    print(f"Pipeline Phase Benchmark: {args.label}")
    print(f"Phase: {args.phase} | Tag: {args.tag}")
    print(f"Output: {base_dir}")
    print(f"Fixed selection: layout={FIXED_LAYOUT_ID}, style={FIXED_STYLE_ID}")
    print(f"{'='*60}\n")

    results = {}
    for topic_key, topic_info in TOPICS.items():
        print(f"\n--- {topic_info['name']} ---")
        topic_dir = base_dir / topic_key
        result = await run_pipeline_for_topic(topic_key, topic_info["topic"], topic_dir)
        results[topic_key] = result

    # Generate/update manifest
    manifest_path = Path(settings.output_dir) / "pipeline-comparison" / "manifest.json"
    if manifest_path.exists():
        manifest = json.loads(manifest_path.read_text())
    else:
        manifest = []

    # Find or create phase entry
    phase_entry = None
    for entry in manifest:
        if entry["phase"] == args.phase:
            phase_entry = entry
            break

    if phase_entry is None:
        phase_entry = {
            "phase": args.phase,
            "label": args.label,
            "topics": [],
        }
        manifest.append(phase_entry)
    else:
        phase_entry["label"] = args.label

    # Update topics in phase entry
    for topic_key, topic_info in TOPICS.items():
        result = results[topic_key]
        # Find existing topic or create new
        existing = None
        for t in phase_entry["topics"]:
            if t["name"] == topic_info["name"]:
                existing = t
                break

        tag_data = {
            "image": f"/output/pipeline-comparison/{args.phase}/{args.tag}/{topic_key}/infographic.png",
            "timings": result["timings"],
            "total_time": result["total_time"],
        }

        if existing:
            existing[args.tag] = tag_data
        else:
            new_topic = {"name": topic_info["name"]}
            new_topic[args.tag] = tag_data
            phase_entry["topics"].append(new_topic)

    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"\nManifest updated: {manifest_path}")

    # Print summary
    print(f"\n{'='*60}")
    print("TIMING SUMMARY")
    print(f"{'='*60}")
    for topic_key, topic_info in TOPICS.items():
        r = results[topic_key]
        print(f"\n  {topic_info['name']}:")
        for step, t in r["timings"].items():
            if step != "total":
                print(f"    {step:20s}: {t:6.1f}s")
        print(f"    {'total':20s}: {r['total_time']:6.1f}s")


if __name__ == "__main__":
    asyncio.run(main())
