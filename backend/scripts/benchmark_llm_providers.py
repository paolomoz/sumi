"""LLM Provider Benchmark: Claude Opus 4.5 vs Cerebras GPT-OSS vs Gemini 3 Pro.

Runs the full infographic pipeline (steps 1-4) with 3 LLM providers,
generates images (step 5, always Gemini image model) for all 9 combinations,
and produces an HTML report with side-by-side comparison.

Usage:
    cd backend && .venv/bin/python -m scripts.benchmark_llm_providers
"""

import asyncio
import html as html_mod
import json
import os
import sys
import time
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import anthropic
import openai
from google import genai
from google.genai import types

from sumi.config import settings

# Engine modules — imported as modules so we can monkeypatch their `chat`/`chat_json`
import sumi.engine.content_analyzer as mod_analyzer
import sumi.engine.content_structurer as mod_structurer
import sumi.engine.combination_recommender as mod_recommender
import sumi.engine.prompt_crafter as mod_crafter
from sumi.engine.image_generator import generate_image
from sumi.references.loader import get_references

# ---------------------------------------------------------------------------
# Load .env for keys not in Settings (e.g. CEREBRAS_API_KEY)
# ---------------------------------------------------------------------------
_env_path = Path(__file__).resolve().parent.parent.parent / ".env"
if _env_path.exists():
    for _line in _env_path.read_text().splitlines():
        _line = _line.strip()
        if _line and not _line.startswith("#") and "=" in _line:
            _k, _, _v = _line.partition("=")
            os.environ.setdefault(_k.strip(), _v.strip())

# ---------------------------------------------------------------------------
# Test topics
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
    "short": {"name": "Short (~30 words)", "topic": TOPIC_SHORT},
    "medium": {"name": "Medium (~200 words)", "topic": TOPIC_MEDIUM},
    "long": {"name": "Long (~2000 words)", "topic": TOPIC_LONG},
}

OUTPUT_DIR = Path(__file__).resolve().parent.parent / "output" / "benchmark"

# ---------------------------------------------------------------------------
# Pricing per million tokens
# ---------------------------------------------------------------------------
PRICING = {
    "claude": {"input": 5.00, "output": 25.00, "model": "claude-opus-4-5-20251101"},
    "cerebras": {"input": 0.35, "output": 0.75, "model": "gpt-oss-120b"},
    "gemini": {"input": 2.00, "output": 12.00, "model": "gemini-3-pro-preview"},
}

PROVIDER_LABELS = {
    "claude": "Claude Opus 4.5",
    "cerebras": "Cerebras GPT-OSS 120B",
    "gemini": "Gemini 3 Pro",
}

STEP_NAMES = ["Analyze", "Structure", "Recommend", "Craft", "Image"]
STEP_COLORS = ["#4ecdc4", "#45b7d1", "#f7dc6f", "#bb8fce", "#e74c3c"]
PROVIDER_COLORS = {"claude": "#d4a574", "cerebras": "#4ecdc4", "gemini": "#4285f4"}

# ---------------------------------------------------------------------------
# Metrics accumulator — provider chat functions append here per call
# ---------------------------------------------------------------------------
_call_log: list[dict] = []


def _reset_log():
    _call_log.clear()


def _collect_log() -> dict:
    """Sum accumulated metrics since last reset."""
    return {
        "time": sum(m["time"] for m in _call_log),
        "input_tokens": sum(m["input_tokens"] for m in _call_log),
        "output_tokens": sum(m["output_tokens"] for m in _call_log),
    }


def _calc_cost(provider_key: str, input_tokens: int, output_tokens: int) -> float:
    rates = PRICING[provider_key]
    return (input_tokens * rates["input"] + output_tokens * rates["output"]) / 1_000_000


# ---------------------------------------------------------------------------
# JSON extraction helper (matches sumi.llm.client.chat_json behavior)
# ---------------------------------------------------------------------------
def _extract_json(text: str) -> dict:
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0]
    elif "```" in text:
        text = text.split("```")[1].split("```")[0]
    return json.loads(text.strip())


# ---------------------------------------------------------------------------
# Provider: Claude (Anthropic)
# ---------------------------------------------------------------------------
_anthropic_client: anthropic.AsyncAnthropic | None = None


def _get_anthropic():
    global _anthropic_client
    if _anthropic_client is None:
        _anthropic_client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    return _anthropic_client


async def claude_chat(
    system: str,
    user_message: str,
    *,
    model: str | None = None,
    max_tokens: int = 4096,
    temperature: float = 0.7,
) -> str:
    client = _get_anthropic()
    t0 = time.time()
    response = await client.messages.create(
        model=PRICING["claude"]["model"],
        max_tokens=max_tokens,
        temperature=temperature,
        system=system,
        messages=[{"role": "user", "content": user_message}],
    )
    elapsed = time.time() - t0
    _call_log.append({
        "time": elapsed,
        "input_tokens": response.usage.input_tokens,
        "output_tokens": response.usage.output_tokens,
    })
    return response.content[0].text


async def claude_chat_json(
    system: str,
    user_message: str,
    *,
    model: str | None = None,
    max_tokens: int = 4096,
    temperature: float = 0.5,
) -> dict:
    text = await claude_chat(
        system, user_message, model=model, max_tokens=max_tokens, temperature=temperature,
    )
    return _extract_json(text)


# ---------------------------------------------------------------------------
# Provider: Cerebras (OpenAI-compatible)
# ---------------------------------------------------------------------------
_cerebras_client: openai.AsyncOpenAI | None = None


def _get_cerebras():
    global _cerebras_client
    if _cerebras_client is None:
        _cerebras_client = openai.AsyncOpenAI(
            api_key=os.environ.get("CEREBRAS_API_KEY", ""),
            base_url="https://api.cerebras.ai/v1",
        )
    return _cerebras_client


async def cerebras_chat(
    system: str,
    user_message: str,
    *,
    model: str | None = None,
    max_tokens: int = 4096,
    temperature: float = 0.7,
) -> str:
    client = _get_cerebras()
    t0 = time.time()
    response = await client.chat.completions.create(
        model=PRICING["cerebras"]["model"],
        max_tokens=max_tokens,
        temperature=temperature,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user_message},
        ],
    )
    elapsed = time.time() - t0
    usage = response.usage
    _call_log.append({
        "time": elapsed,
        "input_tokens": usage.prompt_tokens if usage else 0,
        "output_tokens": usage.completion_tokens if usage else 0,
    })
    return response.choices[0].message.content


async def cerebras_chat_json(
    system: str,
    user_message: str,
    *,
    model: str | None = None,
    max_tokens: int = 4096,
    temperature: float = 0.5,
) -> dict:
    text = await cerebras_chat(
        system, user_message, model=model, max_tokens=max_tokens, temperature=temperature,
    )
    return _extract_json(text)


# ---------------------------------------------------------------------------
# Provider: Gemini (Google GenAI)
# ---------------------------------------------------------------------------
_gemini_client: genai.Client | None = None


def _get_gemini():
    global _gemini_client
    if _gemini_client is None:
        _gemini_client = genai.Client(api_key=settings.google_api_key)
    return _gemini_client


async def gemini_chat(
    system: str,
    user_message: str,
    *,
    model: str | None = None,
    max_tokens: int = 4096,
    temperature: float = 0.7,
) -> str:
    client = _get_gemini()
    t0 = time.time()
    response = await client.aio.models.generate_content(
        model=PRICING["gemini"]["model"],
        contents=user_message,
        config=types.GenerateContentConfig(
            system_instruction=system,
            max_output_tokens=max_tokens,
            temperature=temperature,
        ),
    )
    elapsed = time.time() - t0
    meta = response.usage_metadata
    _call_log.append({
        "time": elapsed,
        "input_tokens": meta.prompt_token_count if meta else 0,
        "output_tokens": meta.candidates_token_count if meta else 0,
    })
    text = response.text
    if text is None:
        # Gemini sometimes returns no text (e.g. safety filters, empty response)
        # Extract from candidates manually
        for c in (response.candidates or []):
            for p in (c.content.parts or []):
                if hasattr(p, "text") and p.text:
                    return p.text
        raise RuntimeError("Gemini returned no text in response")
    return text


async def gemini_chat_json(
    system: str,
    user_message: str,
    *,
    model: str | None = None,
    max_tokens: int = 4096,
    temperature: float = 0.5,
) -> dict:
    text = await gemini_chat(
        system, user_message, model=model, max_tokens=max_tokens, temperature=temperature,
    )
    return _extract_json(text)


# ---------------------------------------------------------------------------
# Provider registry & monkeypatch
# ---------------------------------------------------------------------------
PROVIDERS = {
    "claude": {"chat": claude_chat, "chat_json": claude_chat_json},
    "cerebras": {"chat": cerebras_chat, "chat_json": cerebras_chat_json},
    "gemini": {"chat": gemini_chat, "chat_json": gemini_chat_json},
}


def set_provider(key: str):
    """Monkeypatch engine modules to use the given provider."""
    fns = PROVIDERS[key]
    mod_analyzer.chat = fns["chat"]
    mod_structurer.chat = fns["chat"]
    mod_recommender.chat_json = fns["chat_json"]
    mod_crafter.chat = fns["chat"]


# ---------------------------------------------------------------------------
# Pipeline runner
# ---------------------------------------------------------------------------
async def run_single(provider_key: str, topic_key: str, topic_text: str) -> dict:
    """Run steps 1-5 for one provider × topic combination. Returns metrics dict."""
    set_provider(provider_key)
    run_dir = OUTPUT_DIR / provider_key / topic_key
    run_dir.mkdir(parents=True, exist_ok=True)

    steps = []  # list of {name, time, input_tokens, output_tokens, cost}
    prompt_text = ""
    image_path = None
    image_error = None

    try:
        # Step 1: Analyze
        _reset_log()
        print(f"    Step 1/5: Analyzing content...")
        analysis = await mod_analyzer.analyze_content(topic_text)
        m = _collect_log()
        steps.append({
            "name": "Analyze", **m,
            "cost": _calc_cost(provider_key, m["input_tokens"], m["output_tokens"]),
        })

        # Step 2: Structure
        _reset_log()
        print(f"    Step 2/5: Structuring content...")
        structured = await mod_structurer.generate_structured_content(topic_text, analysis)
        m = _collect_log()
        steps.append({
            "name": "Structure", **m,
            "cost": _calc_cost(provider_key, m["input_tokens"], m["output_tokens"]),
        })

        # Step 3: Recommend
        _reset_log()
        print(f"    Step 3/5: Recommending combinations...")
        recommendations = await mod_recommender.recommend_combinations(topic_text, analysis)
        m = _collect_log()
        steps.append({
            "name": "Recommend", **m,
            "cost": _calc_cost(provider_key, m["input_tokens"], m["output_tokens"]),
        })

        # Pick first recommendation or fallback
        refs = get_references()
        if recommendations:
            layout_id = recommendations[0]["layout_id"]
            style_id = recommendations[0]["style_id"]
        else:
            layout_id = "hub-spoke"
            style_id = "ukiyo-e"

        # Step 4: Craft prompt
        _reset_log()
        print(f"    Step 4/5: Crafting prompt...")
        analysis_md = analysis.get("analysis_markdown", "") if isinstance(analysis, dict) else str(analysis)
        prompt_text = await mod_crafter.craft_prompt(
            layout_id=layout_id,
            style_id=style_id,
            structured_content=structured,
            topic=topic_text,
            analysis=analysis_md,
            aspect_ratio="16:9",
            language="English",
        )
        m = _collect_log()
        steps.append({
            "name": "Craft", **m,
            "cost": _calc_cost(provider_key, m["input_tokens"], m["output_tokens"]),
        })

        # Save prompt
        (run_dir / "prompt.md").write_text(prompt_text, encoding="utf-8")

        # Step 5: Generate image (always Gemini image model)
        print(f"    Step 5/5: Generating image...")
        t0 = time.time()
        actual_path = await generate_image(
            prompt=prompt_text,
            output_path=str(run_dir / "infographic.png"),
            aspect_ratio="16:9",
        )
        img_time = time.time() - t0
        image_path = actual_path
        steps.append({"name": "Image", "time": img_time, "input_tokens": 0, "output_tokens": 0, "cost": 0.0})
        print(f"    Image saved: {Path(actual_path).name} ({img_time:.1f}s)")

    except Exception as e:
        print(f"    ERROR: {e}")
        image_error = str(e)

    total_time = sum(s["time"] for s in steps)
    total_in = sum(s["input_tokens"] for s in steps)
    total_out = sum(s["output_tokens"] for s in steps)
    total_cost = sum(s["cost"] for s in steps)

    return {
        "provider": provider_key,
        "topic": topic_key,
        "topic_name": TOPICS[topic_key]["name"],
        "model": PRICING[provider_key]["model"],
        "steps": steps,
        "prompt_text": prompt_text,
        "image_path": image_path,
        "image_error": image_error,
        "total_time": total_time,
        "total_input_tokens": total_in,
        "total_output_tokens": total_out,
        "total_cost": total_cost,
    }


# ---------------------------------------------------------------------------
# HTML report generation
# ---------------------------------------------------------------------------
def _esc(text: str) -> str:
    return html_mod.escape(text)


def generate_html(all_results: list[dict]) -> str:
    """Generate a dark-themed HTML benchmark report."""

    # --- Aggregate per provider ---
    provider_totals = {}
    for pkey in PROVIDERS:
        runs = [r for r in all_results if r["provider"] == pkey]
        provider_totals[pkey] = {
            "time": sum(r["total_time"] for r in runs),
            "input_tokens": sum(r["total_input_tokens"] for r in runs),
            "output_tokens": sum(r["total_output_tokens"] for r in runs),
            "cost": sum(r["total_cost"] for r in runs),
        }

    # --- 1. Summary cards ---
    cards_html = ""
    for pkey in PROVIDERS:
        t = provider_totals[pkey]
        color = PROVIDER_COLORS[pkey]
        cards_html += f"""
        <div class="card" style="border-top: 3px solid {color};">
            <h3 style="color: {color};">{_esc(PROVIDER_LABELS[pkey])}</h3>
            <p class="card-model">{_esc(PRICING[pkey]['model'])}</p>
            <div class="card-stats">
                <div><span class="stat-val">{t['time']:.1f}s</span><span class="stat-lbl">Total time</span></div>
                <div><span class="stat-val">{t['input_tokens'] + t['output_tokens']:,}</span><span class="stat-lbl">Total tokens</span></div>
                <div><span class="stat-val">${t['cost']:.4f}</span><span class="stat-lbl">Total cost</span></div>
            </div>
        </div>"""

    # --- 2. Timing bar chart ---
    max_time = max((r["total_time"] for r in all_results), default=1)

    bars_html = ""
    for tkey in TOPICS:
        bars_html += f'<div class="bar-group-label">{_esc(TOPICS[tkey]["name"])}</div>'
        for pkey in PROVIDERS:
            run = next((r for r in all_results if r["provider"] == pkey and r["topic"] == tkey), None)
            if not run or not run["steps"]:
                bars_html += f'<div class="bar-row"><span class="bar-label">{_esc(PROVIDER_LABELS[pkey])}</span><div class="bar-track"><div class="bar-empty">No data</div></div></div>'
                continue
            segments = ""
            for i, step in enumerate(run["steps"]):
                pct = (step["time"] / max_time * 100) if max_time > 0 else 0
                color = STEP_COLORS[i] if i < len(STEP_COLORS) else "#888"
                label = f'{step["name"]}: {step["time"]:.1f}s'
                segments += f'<div class="bar-seg" style="width:{pct:.2f}%;background:{color};" title="{_esc(label)}">'
                if pct > 5:
                    segments += f'<span class="seg-text">{step["time"]:.1f}s</span>'
                segments += '</div>'
            bars_html += f"""
            <div class="bar-row">
                <span class="bar-label" style="color:{PROVIDER_COLORS[pkey]};">{_esc(PROVIDER_LABELS[pkey])}</span>
                <div class="bar-track">{segments}</div>
                <span class="bar-total">{run['total_time']:.1f}s</span>
            </div>"""

    # Step legend
    legend_html = '<div class="legend">'
    for i, name in enumerate(STEP_NAMES):
        legend_html += f'<span class="legend-item"><span class="legend-dot" style="background:{STEP_COLORS[i]};"></span>{name}</span>'
    legend_html += '</div>'

    # --- 3. Infographic grid (3×3) ---
    grid_html = '<div class="grid-header"><div class="grid-corner"></div>'
    for pkey in PROVIDERS:
        grid_html += f'<div class="grid-col-hdr" style="color:{PROVIDER_COLORS[pkey]};">{_esc(PROVIDER_LABELS[pkey])}</div>'
    grid_html += '</div>'

    for tkey in TOPICS:
        grid_html += f'<div class="grid-row"><div class="grid-row-hdr">{_esc(TOPICS[tkey]["name"])}</div>'
        for pkey in PROVIDERS:
            run = next((r for r in all_results if r["provider"] == pkey and r["topic"] == tkey), None)
            if run and run["image_path"]:
                rel = f'{pkey}/{tkey}/{Path(run["image_path"]).name}'
                grid_html += f"""
                <div class="grid-cell">
                    <img src="{_esc(rel)}" alt="{_esc(PROVIDER_LABELS[pkey])} — {_esc(tkey)}" loading="lazy" />
                    <div class="cell-meta">{run['total_time']:.1f}s &nbsp;|&nbsp; ${run['total_cost']:.4f}</div>
                </div>"""
            elif run and run.get("image_error"):
                grid_html += f'<div class="grid-cell"><div class="error">{_esc(run["image_error"][:200])}</div></div>'
            else:
                grid_html += '<div class="grid-cell"><div class="error">Not run</div></div>'
        grid_html += '</div>'

    # --- 4. Detailed metrics table ---
    table_rows = ""
    for run in all_results:
        first = True
        row_span = len(run["steps"]) or 1
        for step in run["steps"]:
            table_rows += "<tr>"
            if first:
                table_rows += f'<td rowspan="{row_span}" style="color:{PROVIDER_COLORS[run["provider"]]};">{_esc(PROVIDER_LABELS[run["provider"]])}</td>'
                table_rows += f'<td rowspan="{row_span}">{_esc(run["topic_name"])}</td>'
                first = False
            table_rows += f"""
                <td>{_esc(step['name'])}</td>
                <td class="num">{step['time']:.2f}s</td>
                <td class="num">{step['input_tokens']:,}</td>
                <td class="num">{step['output_tokens']:,}</td>
                <td class="num">${step['cost']:.6f}</td>
            </tr>"""
        if not run["steps"]:
            table_rows += f'<tr><td style="color:{PROVIDER_COLORS[run["provider"]]};">{_esc(PROVIDER_LABELS[run["provider"]])}</td><td>{_esc(run["topic_name"])}</td><td colspan="5" class="error">Failed</td></tr>'

    # --- 5. Expandable prompts ---
    prompts_html = ""
    for run in all_results:
        if run["prompt_text"]:
            prompts_html += f"""
            <details>
                <summary style="color:{PROVIDER_COLORS[run['provider']]};">
                    {_esc(PROVIDER_LABELS[run['provider']])} × {_esc(run['topic_name'])}
                    ({len(run['prompt_text']):,} chars)
                </summary>
                <pre>{_esc(run['prompt_text'])}</pre>
            </details>"""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>LLM Provider Benchmark — Sumi Infographic Pipeline</title>
<style>
*{{margin:0;padding:0;box-sizing:border-box;}}
body{{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0a0a0a;color:#e0e0e0;padding:2rem;max-width:1400px;margin:0 auto;}}
h1{{text-align:center;margin-bottom:.3rem;font-size:1.8rem;color:#fff;}}
h2{{font-size:1.3rem;margin:2rem 0 1rem;color:#fff;border-bottom:1px solid #2a2a2a;padding-bottom:.5rem;}}
.subtitle{{text-align:center;color:#888;margin-bottom:2rem;font-size:.95rem;}}

/* Summary cards */
.cards{{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-bottom:2rem;}}
.card{{background:#141414;border:1px solid #2a2a2a;border-radius:12px;padding:1.5rem;}}
.card h3{{font-size:1.1rem;margin-bottom:.2rem;}}
.card-model{{color:#666;font-size:.8rem;margin-bottom:1rem;font-family:monospace;}}
.card-stats{{display:flex;gap:1.5rem;}}
.card-stats div{{display:flex;flex-direction:column;}}
.stat-val{{font-size:1.2rem;font-weight:700;color:#fff;}}
.stat-lbl{{font-size:.75rem;color:#888;margin-top:.15rem;}}

/* Timing bars */
.timing-section{{background:#141414;border:1px solid #2a2a2a;border-radius:12px;padding:1.5rem;margin-bottom:2rem;}}
.bar-group-label{{font-size:.9rem;font-weight:600;margin:1rem 0 .4rem;color:#aaa;}}
.bar-group-label:first-child{{margin-top:0;}}
.bar-row{{display:flex;align-items:center;gap:.75rem;margin-bottom:.3rem;}}
.bar-label{{width:180px;font-size:.8rem;flex-shrink:0;text-align:right;}}
.bar-track{{flex:1;display:flex;height:28px;background:#1a1a1a;border-radius:4px;overflow:hidden;}}
.bar-seg{{display:flex;align-items:center;justify-content:center;min-width:2px;transition:width .3s;}}
.seg-text{{font-size:.65rem;color:#000;font-weight:600;white-space:nowrap;}}
.bar-total{{width:60px;font-size:.8rem;color:#888;text-align:left;flex-shrink:0;}}
.bar-empty{{color:#555;font-size:.75rem;padding:0 .5rem;display:flex;align-items:center;}}
.legend{{display:flex;gap:1rem;margin-top:.75rem;flex-wrap:wrap;}}
.legend-item{{display:flex;align-items:center;gap:.3rem;font-size:.8rem;color:#aaa;}}
.legend-dot{{width:12px;height:12px;border-radius:3px;flex-shrink:0;}}

/* Infographic grid */
.infographic-section{{margin-bottom:2rem;}}
.grid-header,.grid-row{{display:grid;grid-template-columns:140px repeat(3,1fr);gap:1rem;margin-bottom:1rem;}}
.grid-corner{{}}
.grid-col-hdr{{font-size:.9rem;font-weight:600;text-align:center;}}
.grid-row-hdr{{font-size:.85rem;color:#aaa;display:flex;align-items:center;}}
.grid-cell{{background:#141414;border:1px solid #2a2a2a;border-radius:8px;overflow:hidden;}}
.grid-cell img{{width:100%;display:block;}}
.cell-meta{{padding:.4rem .6rem;font-size:.75rem;color:#888;text-align:center;}}
.error{{background:#2a1010;color:#ff6b6b;padding:1rem;text-align:center;font-size:.8rem;border-radius:8px;}}

/* Metrics table */
.table-wrap{{overflow-x:auto;margin-bottom:2rem;}}
table{{width:100%;border-collapse:collapse;font-size:.82rem;}}
th{{background:#1a1a1a;color:#aaa;padding:.6rem .5rem;text-align:left;font-weight:600;border-bottom:1px solid #333;}}
td{{padding:.5rem;border-bottom:1px solid #1e1e1e;}}
.num{{text-align:right;font-family:monospace;}}

/* Prompts */
details{{margin-bottom:.5rem;}}
summary{{cursor:pointer;color:#888;font-size:.85rem;padding:.4rem 0;}}
summary:hover{{color:#ccc;}}
pre{{background:#1a1a1a;border:1px solid #333;border-radius:8px;padding:1rem;overflow-x:auto;font-size:.72rem;color:#ccc;max-height:400px;overflow-y:auto;margin-top:.3rem;white-space:pre-wrap;word-wrap:break-word;}}
</style>
</head>
<body>
<h1>LLM Provider Benchmark</h1>
<p class="subtitle">Claude Opus 4.5 vs Cerebras GPT-OSS 120B vs Gemini 3 Pro — Sumi infographic pipeline (steps 1-4), images always via Gemini</p>

<div class="cards">{cards_html}</div>

<h2>Timing Breakdown</h2>
<div class="timing-section">
{bars_html}
{legend_html}
</div>

<h2>Generated Infographics</h2>
<div class="infographic-section">
{grid_html}
</div>

<h2>Detailed Metrics</h2>
<div class="table-wrap">
<table>
<thead><tr><th>Provider</th><th>Topic</th><th>Step</th><th>Time</th><th>Input tokens</th><th>Output tokens</th><th>Cost</th></tr></thead>
<tbody>{table_rows}</tbody>
</table>
</div>

<h2>Crafted Prompts</h2>
{prompts_html}

</body>
</html>"""


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
async def main():
    print("=" * 64)
    print("  LLM PROVIDER BENCHMARK")
    print("  Claude Opus 4.5 · Cerebras GPT-OSS 120B · Gemini 3 Pro")
    print("=" * 64)
    print(f"\nOutput: {OUTPUT_DIR}")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    all_results: list[dict] = []

    for pkey in PROVIDERS:
        print(f"\n{'='*64}")
        print(f"  Provider: {PROVIDER_LABELS[pkey]} ({PRICING[pkey]['model']})")
        print(f"{'='*64}")

        for tkey, tinfo in TOPICS.items():
            print(f"\n  [{pkey}/{tkey}] Running pipeline...")
            result = await run_single(pkey, tkey, tinfo["topic"])
            all_results.append(result)
            print(f"  [{pkey}/{tkey}] Done — {result['total_time']:.1f}s, ${result['total_cost']:.4f}")

        # Sleep between providers to avoid rate limits
        if pkey != list(PROVIDERS.keys())[-1]:
            print("\n  Sleeping 2s before next provider...")
            await asyncio.sleep(2)

    # Save raw results as JSON (non-serializable fields removed)
    json_results = []
    for r in all_results:
        jr = {k: v for k, v in r.items() if k != "prompt_text"}
        jr["prompt_length"] = len(r.get("prompt_text", ""))
        json_results.append(jr)
    (OUTPUT_DIR / "results.json").write_text(json.dumps(json_results, indent=2), encoding="utf-8")

    # Generate HTML report
    html = generate_html(all_results)
    html_path = OUTPUT_DIR / "benchmark.html"
    html_path.write_text(html, encoding="utf-8")

    print(f"\n{'='*64}")
    print(f"  DONE! Report: {html_path}")
    print(f"{'='*64}")

    # Summary
    for pkey in PROVIDERS:
        runs = [r for r in all_results if r["provider"] == pkey]
        total_t = sum(r["total_time"] for r in runs)
        total_c = sum(r["total_cost"] for r in runs)
        print(f"  {PROVIDER_LABELS[pkey]:30s}  {total_t:7.1f}s  ${total_c:.4f}")


if __name__ == "__main__":
    asyncio.run(main())
