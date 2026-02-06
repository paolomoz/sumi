"""Image Provider Benchmark: Gemini 3 vs Recraft V3.

Runs 3 fixed topics through the Cerebras/fast LLM pipeline once, then
generates the image twice — once with Gemini 3 and once with Recraft V3.
Same prompt, different image generators.

Pass --recraft-only to skip the LLM pipeline and Gemini, re-using existing
prompts and Gemini results from a previous run.

Usage:
    cd backend && .venv/bin/python -m scripts.benchmark_image_providers
    cd backend && .venv/bin/python -m scripts.benchmark_image_providers --recraft-only
"""

import asyncio
import json
import os
import sys
import time
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sumi.config import settings

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

# Map FAL_API_KEY -> FAL_KEY (fal_client expects FAL_KEY)
if not os.environ.get("FAL_KEY"):
    _fal_key = settings.fal_api_key or os.environ.get("FAL_API_KEY", "")
    if _fal_key:
        os.environ["FAL_KEY"] = _fal_key

# ---------------------------------------------------------------------------
# Imports AFTER .env is loaded (so API keys are available)
# ---------------------------------------------------------------------------
import fal_client
from sumi.llm.client import cerebras_chat
import sumi.engine.content_analyzer as analyzer_mod
import sumi.engine.content_structurer as structurer_mod
import sumi.engine.content_synthesizer as synthesizer_mod
import sumi.engine.prompt_crafter as crafter_mod

from sumi.engine.content_synthesizer import synthesize_if_needed
from sumi.engine.content_analyzer import analyze_content
from sumi.engine.content_structurer import generate_structured_content
from sumi.engine.prompt_crafter import craft_prompt
from sumi.engine.image_generator import generate_image
from sumi.references.loader import get_references

# ---------------------------------------------------------------------------
# Test topics (same as other benchmarks)
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
would otherwise be. Without this natural greenhouse effect, Earth's average \
temperature would be roughly −18°C, far too cold for most life.

Human activities have dramatically amplified this natural process. Since the \
Industrial Revolution, atmospheric CO₂ concentrations have risen from \
approximately 280 parts per million to over 420 ppm — the highest level in at \
least 800,000 years of ice core records. The Intergovernmental Panel on Climate \
Change (IPCC) reports that global average surface temperature has increased by \
approximately 1.1°C above pre-industrial levels, with the rate of warming \
accelerating over recent decades.

Climate sensitivity — the amount of warming expected from a doubling of CO₂ — is \
estimated at 2.5°C to 4.0°C, with a best estimate around 3°C. Feedback \
mechanisms complicate projections: melting ice reduces Earth's reflectivity \
(albedo), amplifying warming; thawing permafrost releases stored methane and CO₂; \
warmer oceans absorb less CO₂ over time. These positive feedbacks create the risk \
of tipping points — thresholds beyond which changes become self-reinforcing and \
potentially irreversible, regardless of subsequent emission reductions.

## Environmental Impacts

Rising global temperatures are driving measurable changes across Earth's physical \
systems. Arctic sea ice extent has declined by approximately 13% per decade since \
satellite monitoring began in 1979, with summer ice coverage reaching historic \
lows. Mountain glaciers worldwide are retreating at accelerating rates — the Alps \
have lost over half their ice volume since 1900. Greenland and Antarctic ice \
sheets are shedding mass at rates that have tripled since the 1990s, contributing \
increasingly to sea level rise.

Global mean sea level has risen approximately 20 centimeters since 1900, with the \
rate of rise doubling in recent decades. Current projections range from 0.3 to \
1.0 meters of additional rise by 2100 under moderate emission scenarios, though \
ice sheet instability could produce higher outcomes. Low-lying island nations face \
existential threats, while coastal megacities including Miami, Shanghai, Mumbai, \
and Lagos confront escalating risks from flooding, storm surge, and saltwater \
intrusion into freshwater supplies.

Extreme weather events have intensified in both frequency and severity. Heat \
waves have become longer, more frequent, and more intense — the number of days \
exceeding 50°C has doubled since the 1980s. Tropical cyclones are reaching higher \
peak intensities and producing more rainfall due to warmer ocean surfaces and a \
more moisture-laden atmosphere. Drought patterns are shifting, with subtropical \
regions experiencing increasing aridity while some northern latitudes receive \
heavier precipitation.

Marine ecosystems face the dual threats of warming and acidification. The ocean \
has absorbed approximately 30% of anthropogenic CO₂ emissions, lowering surface \
pH by 0.1 units — a 26% increase in acidity. Coral reefs, which support roughly \
25% of marine species, have experienced repeated mass bleaching events. The Great \
Barrier Reef suffered severe bleaching in 2016, 2017, 2020, 2022, and 2024. \
Projected warming threatens the survival of most tropical coral reef ecosystems \
by mid-century.

Terrestrial biodiversity is equally threatened. Species are shifting their ranges \
poleward and to higher elevations at average rates of 17 kilometers per decade \
and 11 meters upslope per decade, respectively. Many species cannot migrate fast \
enough to track their required climate conditions. Phenological mismatches — where \
interdependent species respond differently to warming — disrupt pollination, \
predator-prey relationships, and food webs. An estimated one million species face \
heightened extinction risk from the combined effects of climate change and habitat \
loss.

## Human and Economic Impacts

Agricultural systems face mounting pressure from changing climate conditions. Crop \
yields for staple cereals — wheat, rice, and maize — are projected to decline by \
2–6% per decade in many regions due to heat stress, altered precipitation \
patterns, and increased pest pressure. While some northern regions may see \
temporary yield gains, global net agricultural productivity is expected to \
decrease. Livestock production is similarly affected through heat stress on \
animals, reduced pasture productivity, and increased water scarcity. Food price \
volatility and supply chain disruptions compound these production losses.

Human health impacts span direct and indirect pathways. Heat-related mortality is \
increasing, particularly among elderly and outdoor workers in tropical and \
subtropical regions. The geographic range of vector-borne diseases including \
malaria, dengue, and Zika is expanding as temperatures rise. Worsened air quality \
from increased ground-level ozone and wildfire smoke contributes to respiratory \
and cardiovascular disease. Mental health consequences — including eco-anxiety, \
post-disaster trauma, and grief over environmental loss — represent an emerging \
public health concern.

The economic costs of climate change are immense and accelerating. Climate-related \
disasters caused over $300 billion in damages globally in 2023 alone, and \
economic modeling suggests that unmitigated warming could reduce global GDP by \
10–23% by 2100. The costs fall disproportionately on developing nations, which \
have contributed least to historical emissions yet face the greatest vulnerability \
due to geographic exposure, economic dependence on climate-sensitive sectors, and \
limited institutional capacity for adaptation.

Climate-induced migration is an escalating humanitarian concern. The World Bank \
projects that by 2050, up to 216 million people could become internal climate \
migrants — displaced within their own countries by sea level rise, water scarcity, \
declining crop productivity, and extreme weather. Cross-border climate migration \
adds geopolitical complexity, as international legal frameworks do not currently \
recognize climate refugees. Urban areas in developing nations face particular \
pressure as rural populations migrate to cities already strained by rapid growth.

## Mitigation Strategies

The Paris Agreement established the international framework for climate \
mitigation, with the goal of limiting global warming to well below 2°C and \
pursuing efforts toward 1.5°C above pre-industrial levels. Achieving these \
targets requires reaching global net-zero CO₂ emissions by approximately 2050, \
with substantial emission reductions across every sector of the economy. Current \
nationally determined contributions (NDCs) are collectively insufficient, placing \
the world on a trajectory for approximately 2.5–2.8°C of warming by 2100.

The energy sector transformation is the most critical mitigation pathway, as \
energy production and use account for approximately 73% of global greenhouse gas \
emissions. Renewable energy technologies — particularly solar photovoltaics and \
onshore wind — have experienced dramatic cost reductions of 85–90% over the past \
decade, making them the cheapest sources of new electricity generation in most \
markets worldwide. Global renewable capacity must roughly triple by 2030 to \
remain consistent with 1.5°C pathways. Energy storage technologies, including \
lithium-ion batteries and emerging alternatives, are essential for managing \
renewable intermittency.

Transportation decarbonization requires electrification of passenger vehicles, \
advancement of zero-emission technologies for heavy transport, and systemic \
changes in urban mobility. Electric vehicle adoption is accelerating rapidly, with \
global sales exceeding 14 million units in 2023 and expected to reach 40% of new \
car sales by 2030. Maritime shipping and aviation present greater technical \
challenges but are pursuing solutions through green hydrogen, ammonia-powered \
vessels, sustainable aviation fuels, and efficiency improvements in vessel and \
aircraft design.

Industrial decarbonization addresses the approximately 20% of global emissions \
from cement, steel, chemicals, and other heavy industries. Green hydrogen produced \
from renewable electricity can replace fossil fuels in high-temperature processes. \
Carbon capture and storage can reduce emissions from inherently carbon-intensive \
processes like cement calcination. Circular economy strategies — reducing material \
demand, extending product lifetimes, and maximizing recycling — can reduce \
industrial emissions by an estimated 40% while generating economic value and \
reducing resource dependence.

Nature-based solutions complement technological mitigation approaches. \
Reforestation, afforestation, and improved forest management can sequester \
significant quantities of CO₂ while providing biodiversity co-benefits. Protecting \
and restoring wetlands, mangroves, and seagrass meadows enhances coastal carbon \
storage in so-called "blue carbon" ecosystems. Regenerative agricultural \
practices, including cover cropping, reduced tillage, and agroforestry, build soil \
carbon stocks while improving farm resilience. These approaches are often \
cost-effective but require robust monitoring and governance to ensure permanence.

## Adaptation Strategies

Climate adaptation acknowledges that some degree of additional warming is \
inevitable due to the inertia of the climate system and past emissions. Effective \
adaptation reduces vulnerability, enhances resilience, and may create new \
opportunities. The IPCC emphasizes that adaptation and mitigation are \
complementary strategies — neither alone is sufficient. Investment in adaptation \
has historically lagged behind mitigation, but recognition of its importance is \
growing as climate impacts intensify.

Infrastructure adaptation requires incorporating future climate projections into \
design standards and planning decisions. This includes upgrading urban drainage \
systems for more intense rainfall, designing buildings for higher temperatures and \
stronger winds, elevating critical infrastructure above projected flood levels, \
and improving grid resilience through distributed energy resources and underground \
power lines. Heat-resilient urban design — incorporating green roofs, urban \
forests, cool pavements, and improved ventilation corridors — can significantly \
reduce heat island effects in cities.

Agricultural adaptation encompasses a range of strategies from farm-level \
practices to systemic changes in food systems. Developing and deploying \
drought-tolerant, heat-resistant, and salt-tolerant crop varieties through \
conventional breeding and genetic techniques can maintain productivity under \
changing conditions. Precision agriculture technologies optimize water and \
nutrient use. Crop diversification, adjusted planting calendars, and integrated \
pest management help farmers manage increasing variability. Insurance mechanisms \
and social protection programs provide safety nets for climate-related crop \
failures.

Water resource management must evolve to address altered precipitation patterns, \
glacier retreat, and increasing demand. Strategies include expanding reservoir \
capacity, implementing managed aquifer recharge, improving irrigation efficiency \
through drip and precision systems, investing in water recycling and desalination \
where economically viable, and establishing water pricing and trading mechanisms \
that reflect scarcity. Watershed restoration and protection of natural water \
infrastructure — forests, wetlands, and floodplains — provide cost-effective water \
management while delivering ecosystem co-benefits.

## The Path Forward

The choices made in this decade will largely determine the trajectory of climate \
change for centuries to come. Limiting warming to 1.5°C remains technically \
feasible but requires immediate, sustained, and unprecedented action across all \
sectors and regions. Global CO₂ emissions must decline by approximately 45% from \
2010 levels by 2030 and reach net zero by 2050. This demands mobilizing climate \
finance to at least $4 trillion annually by 2030, accelerating technology \
deployment, strengthening international cooperation, and ensuring a just \
transition that protects vulnerable communities and workers in carbon-intensive \
industries.

Ultimately, addressing climate change is not merely an environmental imperative \
but a question of intergenerational justice, economic resilience, and human \
security. The technologies and policies needed to decarbonize the global economy \
largely exist today — what remains is the political will and institutional \
capacity to deploy them at the required speed and scale. Every fraction of a \
degree of warming avoided prevents significant additional suffering and ecological \
loss. The transition to a net-zero economy represents not just a response to \
crisis but an opportunity to build a more equitable, healthy, and prosperous world."""

TOPICS = {
    "short": {"name": "Coffee - Short", "topic": TOPIC_SHORT},
    "medium": {"name": "Space - Medium", "topic": TOPIC_MEDIUM},
    "long": {"name": "Climate - Long", "topic": TOPIC_LONG},
}

# Fixed style/layout to eliminate variability
FIXED_LAYOUT_ID = "hub-spoke"
FIXED_STYLE_ID = "ukiyo-e"


# ---------------------------------------------------------------------------
# Cerebras wrapper that handles list-based system prompts
# ---------------------------------------------------------------------------

async def _cerebras_chat_compat(
    system: "str | list[dict]",
    user_message: str,
    *,
    model: str | None = None,
    max_tokens: int = 4096,
    temperature: float = 0.7,
) -> str:
    """Wrapper around cerebras_chat that flattens list-based system prompts."""
    if isinstance(system, list):
        system = "\n\n".join(block["text"] for block in system if "text" in block)
    return await cerebras_chat(
        system=system,
        user_message=user_message,
        model=model,
        max_tokens=max_tokens,
        temperature=temperature,
    )


def _patch_cerebras():
    """Monkey-patch all engine modules to use Cerebras."""
    analyzer_mod.chat = _cerebras_chat_compat
    structurer_mod.chat = _cerebras_chat_compat
    synthesizer_mod.chat = _cerebras_chat_compat
    crafter_mod.chat = _cerebras_chat_compat
    print("  Patched all LLM calls -> Cerebras (fast mode)")


# ---------------------------------------------------------------------------
# Recraft V3 image generation
# ---------------------------------------------------------------------------

async def generate_recraft_image(prompt: str, output_path: str) -> str:
    """Generate an image with Recraft V3 via fal.ai and save to disk."""
    import httpx

    # Recraft V3 has a 1000-char prompt limit
    truncated_prompt = prompt[:1000] if len(prompt) > 1000 else prompt

    result = await fal_client.subscribe_async(
        "fal-ai/recraft/v3/text-to-image",
        arguments={
            "prompt": truncated_prompt,
            "image_size": "landscape_16_9",
            "style": "digital_illustration",
        },
    )

    image_url = result["images"][0]["url"]

    # Download image bytes
    async with httpx.AsyncClient() as client:
        resp = await client.get(image_url)
        resp.raise_for_status()
        image_bytes = resp.content

    # Determine extension from content-type
    content_type = resp.headers.get("content-type", "image/jpeg")
    if "png" in content_type:
        ext = ".png"
    elif "webp" in content_type:
        ext = ".webp"
    else:
        ext = ".jpg"

    # Adjust output path extension
    out = Path(output_path).with_suffix(ext)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(image_bytes)

    return str(out)


# ---------------------------------------------------------------------------
# Per-topic pipeline
# ---------------------------------------------------------------------------

async def run_topic(topic_key: str, topic_text: str, base_dir: Path) -> dict:
    """Run LLM pipeline once, then generate image with both providers."""
    topic_dir = base_dir / topic_key
    topic_dir.mkdir(parents=True, exist_ok=True)

    # --- LLM pipeline (once) ---
    print(f"  [{topic_key}] LLM pipeline starting...")
    llm_start = time.monotonic()

    print(f"  [{topic_key}]   Pre-synthesis...")
    topic = await synthesize_if_needed(topic_text)

    print(f"  [{topic_key}]   Analyzing...")
    analysis = await analyze_content(topic)

    print(f"  [{topic_key}]   Structuring...")
    structured = await generate_structured_content(topic, analysis)

    print(f"  [{topic_key}]   Crafting prompt...")
    analysis_md = analysis.get("analysis_markdown", "") if isinstance(analysis, dict) else str(analysis)
    prompt = await craft_prompt(
        layout_id=FIXED_LAYOUT_ID,
        style_id=FIXED_STYLE_ID,
        structured_content=structured,
        topic=topic,
        analysis=analysis_md,
        aspect_ratio="16:9",
        language="English",
    )

    llm_time = round(time.monotonic() - llm_start, 2)
    print(f"  [{topic_key}] LLM pipeline done in {llm_time:.1f}s")

    # Save prompt
    (topic_dir / "prompt.md").write_text(prompt, encoding="utf-8")

    # --- Gemini image ---
    print(f"  [{topic_key}] Generating image with Gemini 3...")
    gemini_dir = topic_dir / "gemini"
    gemini_dir.mkdir(parents=True, exist_ok=True)
    gemini_start = time.monotonic()
    gemini_path = await generate_image(
        prompt=prompt,
        output_path=str(gemini_dir / "infographic.png"),
        aspect_ratio="16:9",
    )
    gemini_time = round(time.monotonic() - gemini_start, 2)
    print(f"  [{topic_key}] Gemini done in {gemini_time:.1f}s")

    # --- Recraft image ---
    print(f"  [{topic_key}] Generating image with Recraft V3...")
    recraft_dir = topic_dir / "recraft"
    recraft_dir.mkdir(parents=True, exist_ok=True)
    recraft_start = time.monotonic()
    recraft_path = await generate_recraft_image(
        prompt=prompt,
        output_path=str(recraft_dir / "infographic.jpg"),
    )
    recraft_time = round(time.monotonic() - recraft_start, 2)
    print(f"  [{topic_key}] Recraft done in {recraft_time:.1f}s")

    return {
        "llm_time": llm_time,
        "gemini_time": gemini_time,
        "gemini_filename": Path(gemini_path).name,
        "recraft_time": recraft_time,
        "recraft_filename": Path(recraft_path).name,
    }


async def run_recraft_only(topic_key: str, base_dir: Path) -> dict:
    """Re-generate only the Recraft image using an existing prompt."""
    topic_dir = base_dir / topic_key
    prompt_path = topic_dir / "prompt.md"
    if not prompt_path.exists():
        raise FileNotFoundError(f"No existing prompt at {prompt_path} — run full pipeline first")
    prompt = prompt_path.read_text(encoding="utf-8")

    print(f"  [{topic_key}] Generating image with Recraft V3...")
    recraft_dir = topic_dir / "recraft"
    recraft_dir.mkdir(parents=True, exist_ok=True)
    recraft_start = time.monotonic()
    recraft_path = await generate_recraft_image(
        prompt=prompt,
        output_path=str(recraft_dir / "infographic.jpg"),
    )
    recraft_time = round(time.monotonic() - recraft_start, 2)
    print(f"  [{topic_key}] Recraft done in {recraft_time:.1f}s")

    return {
        "recraft_time": recraft_time,
        "recraft_filename": Path(recraft_path).name,
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

async def main():
    import argparse

    parser = argparse.ArgumentParser(description="Image provider benchmark")
    parser.add_argument(
        "--recraft-only",
        action="store_true",
        help="Only regenerate Recraft images using existing prompts & Gemini results",
    )
    args = parser.parse_args()

    base_dir = Path(settings.output_dir) / "image-comparison"
    base_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = base_dir / "manifest.json"

    if args.recraft_only:
        # ------------------------------------------------------------------
        # Recraft-only mode: reuse existing prompts & Gemini data
        # ------------------------------------------------------------------
        if not manifest_path.exists():
            print("ERROR: No existing manifest.json — run full pipeline first")
            sys.exit(1)

        old_manifest = json.loads(manifest_path.read_text())
        old_by_name = {t["name"]: t for t in old_manifest["topics"]}

        print(f"\n{'='*60}")
        print("Image Provider Benchmark: Recraft V3 only (reusing prompts)")
        print(f"Output: {base_dir}")
        print(f"{'='*60}\n")

        manifest = {"topics": []}
        for topic_key, topic_info in TOPICS.items():
            print(f"\n--- {topic_info['name']} ---")
            r = await run_recraft_only(topic_key, base_dir)
            old = old_by_name.get(topic_info["name"], {})
            manifest["topics"].append({
                "name": topic_info["name"],
                "llm_time": old.get("llm_time", 0),
                "gemini": old.get("gemini", {"image": "", "time": 0}),
                "recraft": {
                    "image": f"/output/image-comparison/{topic_key}/recraft/{r['recraft_filename']}",
                    "time": r["recraft_time"],
                },
            })

        manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
        print(f"\nManifest updated: {manifest_path}")

        print(f"\n{'='*60}")
        print("TIMING SUMMARY")
        print(f"{'='*60}")
        for t in manifest["topics"]:
            gemini_t = t["gemini"]["time"]
            recraft_t = t["recraft"]["time"]
            print(f"\n  {t['name']}:")
            print(f"    LLM pipeline:     {t['llm_time']:6.1f}s (previous run)")
            print(f"    Gemini image:     {gemini_t:6.1f}s (previous run)")
            print(f"    Recraft image:    {recraft_t:6.1f}s")

    else:
        # ------------------------------------------------------------------
        # Full mode: LLM pipeline + both image providers
        # ------------------------------------------------------------------
        print(f"\n{'='*60}")
        print("Image Provider Benchmark: Gemini 3 vs Recraft V3")
        print(f"Output: {base_dir}")
        print(f"LLM: Cerebras (fast mode)")
        print(f"Fixed: layout={FIXED_LAYOUT_ID}, style={FIXED_STYLE_ID}")
        print(f"{'='*60}\n")

        _patch_cerebras()

        results = {}
        for topic_key, topic_info in TOPICS.items():
            print(f"\n--- {topic_info['name']} ---")
            result = await run_topic(topic_key, topic_info["topic"], base_dir)
            results[topic_key] = result

        manifest = {"topics": []}
        for topic_key, topic_info in TOPICS.items():
            r = results[topic_key]
            manifest["topics"].append({
                "name": topic_info["name"],
                "llm_time": r["llm_time"],
                "gemini": {
                    "image": f"/output/image-comparison/{topic_key}/gemini/{r['gemini_filename']}",
                    "time": r["gemini_time"],
                },
                "recraft": {
                    "image": f"/output/image-comparison/{topic_key}/recraft/{r['recraft_filename']}",
                    "time": r["recraft_time"],
                },
            })

        manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
        print(f"\nManifest written: {manifest_path}")

        print(f"\n{'='*60}")
        print("TIMING SUMMARY")
        print(f"{'='*60}")
        for topic_key, topic_info in TOPICS.items():
            r = results[topic_key]
            print(f"\n  {topic_info['name']}:")
            print(f"    LLM pipeline:     {r['llm_time']:6.1f}s")
            print(f"    Gemini image:     {r['gemini_time']:6.1f}s")
            print(f"    Recraft image:    {r['recraft_time']:6.1f}s")


if __name__ == "__main__":
    asyncio.run(main())
