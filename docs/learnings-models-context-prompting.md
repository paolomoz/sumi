# Learnings: Models, Context & Prompting

What we learned building Sumi's AI pipeline for generating artistic infographics from text.

---

## 1. Pipeline Architecture

### Decomposition beats monolith

A single "generate an infographic from this topic" prompt does not work. Breaking the task into 5 sequential steps produced dramatically better results:

1. **Synthesize** — compress long inputs into structured briefs
2. **Analyze** — classify content type, identify visual opportunities
3. **Structure** — organize into designer-ready sections with text labels
4. **Craft** — translate structured content into a visual scene description
5. **Generate** — feed the crafted prompt to an image model

Each step has a focused role, a calibrated temperature, and a constrained output format. The LLM performs better when it only has one job per call.

### Context is hierarchical, not cumulative

We don't dump everything into one giant prompt. Each step's output becomes the next step's input, progressively transforming raw text into visual instructions:

- Synthesis compresses long input (threshold: 10k chars)
- Analysis produces structured markdown (not raw text)
- Structuring further organizes into labeled sections
- Crafting references style/layout files by ID (not inline)

This prevents context explosion. The crafter receives ~2-3k tokens of structured content, not 10k tokens of raw source text.

### Human checkpoints matter

The pipeline pauses after structuring to let the user pick a layout + style combination. This single human decision point makes the output feel intentional rather than algorithmic. The LLM recommends 3 options (best match, creative, accessible) but the human chooses.

---

## 2. LLM Model Selection

### Claude Opus vs Cerebras GPT-OSS 120B

We benchmarked three LLM providers for the text pipeline:

| Provider | Model | Input cost/1M | Output cost/1M | Relative cost |
|----------|-------|---------------|-----------------|---------------|
| Claude | Opus 4.5 | $5.00 | $25.00 | 1x |
| Gemini | 3 Pro | $2.00 | $12.00 | ~0.5x |
| Cerebras | GPT-OSS 120B | $0.35 | $0.75 | ~0.02x |

**Key finding**: Cerebras at ~2% of Claude's cost produces acceptable infographics for this task. The structured pipeline (clear roles, explicit rules, reference documents) compensates for the model's smaller size. Not every step needs frontier intelligence.

**Why this works**: The pipeline constrains the LLM's job at each step. Role-based system prompts, explicit output formats, and reference frameworks guide the model. A 120B-parameter model following a detailed framework can match a frontier model operating with less structure.

**When it doesn't work**: Complex reasoning about visual metaphors and nuanced style interpretation are noticeably better with Claude. The "creative" recommendation and prompt crafting steps benefit most from a stronger model.

### Dual-mode as a product decision

We shipped both modes ("fast" and "detailed") instead of choosing one. Same pipeline architecture, different LLM router. This lets users trade quality for speed/cost depending on their need.

---

## 3. Image Generation Models

### The text rendering problem

Infographics require legible text rendered into images. This is the hardest constraint and the primary driver of model selection.

| Provider | Text Quality | Style Adherence | Speed | Prompt Limit |
|----------|-------------|-----------------|-------|-------------|
| Gemini 3 | Good | Best | ~5-8s | Unlimited |
| Recraft V3 | Excellent | Too diagrammatic | ~3-5s | 1000 chars |
| FLUX.2 Pro | Poor (garbled) | Good | Fast | Large |
| Ideogram V3 | Mediocre | Inconsistent | Medium | Large |

**Winner: Gemini 3.** Best balance of text quality and artistic style adherence.

### Why Recraft lost despite better text

Recraft V3 renders text crisply but its output looks like a technical diagram, not an artistic infographic. The prompt says "ukiyo-e style" and Recraft produces a clean infographic with Japanese decorative borders. Gemini produces something that actually looks like a woodblock print with information embedded in it.

Also, Recraft's 1000-character prompt limit is a dealbreaker. Our crafted prompts are 3-5k characters. Truncation destroys the carefully structured visual instructions.

### Aspect ratio as text, not API parameter

Gemini 3 takes aspect ratio as text appended to the prompt: `"Aspect ratio: 16:9."` — not as a separate API parameter. This is a quirk to know about.

---

## 4. Prompting Strategies

### Temperature calibration by task type

| Step | Temperature | Rationale |
|------|------------|-----------|
| Synthesize | 0.3 | Extraction must be faithful, not creative |
| Analyze | 0.5 | Balanced analysis with clarity |
| Structure | 0.5 | Organized but not rigid |
| Recommend | 0.7 | Creative selection, explain reasoning |
| Craft | 0.7 | Visual metaphor invention |
| JSON outputs | 0.5 | Structural reliability |

Low temperature for extraction, high temperature for creative synthesis. This seems obvious in retrospect but the default instinct is to keep everything at 0.7.

### Role-based system prompts

Each pipeline step assigns one clear role:
- Analyzer: "content analysis expert applying instructional design"
- Structurer: "expert instructional designer"
- Crafter: "expert visual designer crafting prompts"
- Recommender: "art director specializing in infographic design"

One role per step. The analyzer doesn't design; the designer doesn't analyze. Role confusion degrades output quality.

### Instructional design language works

We frame infographics as learning tools, not art pieces. Using instructional design vocabulary ("learning objectives", "visual opportunities", "cognitive load") produced better-organized content than generic "design an infographic" prompting.

LLMs trained on educational content respond well to this framing. It forces structured thinking about what the viewer should *understand*, not just what they should *see*.

### The Verbatim Rule

All statistics, quotes, names, and dates must be copied exactly from source material. System prompts explicitly state: *"Never round numbers. Never paraphrase quotes. Never substitute simpler words."*

Without this rule, LLMs confidently "improve" data. A stat of 13.7% becomes "about 14%". A quote gets paraphrased for flow. For infographics, where the data *is* the content, this is unacceptable.

### Describe visual scenes, not abstract concepts

The prompt crafter's most important rule: *"Describe VISUAL SCENES, not abstract concepts. Tell the image generator what to DRAW."*

Bad: "Show the concept of trust"
Good: "Guardian komainu statues standing watch at a temple gate, with small figures passing safely beneath"

Image models don't understand abstractions. They understand objects, scenes, spatial relationships, and visual compositions.

### Visual metaphor mappings bridge content and style

The most effective prompting innovation was Visual Metaphor Mappings — a table in each style definition that maps abstract concepts to style-specific visual elements:

```
| Abstract Concept  | Ukiyo-e Metaphor                        |
|-------------------|-----------------------------------------|
| Data/information  | Scrolls, flowing water                  |
| Processes         | Paths (Tokaido road), rivers, bridges   |
| Systems           | Islands, buildings, castle towns         |
| Connections       | Bridges, boats, flying cranes           |
| Growth            | Bamboo, cherry blossoms, seasons        |
```

Without these mappings, the LLM produces generic "Japanese-flavored" infographics. With them, it produces infographics that feel native to the style because every visual element is grounded in that style's visual vocabulary.

---

## 5. Context & Token Management

### Prompt caching saves 30-40% on template-heavy steps

The analysis framework (~400 lines) and structured content template are identical across requests. Using Anthropic's `cache_control: {"type": "ephemeral"}` caches them for 5 minutes — sufficient for a pipeline run.

```python
system = [
    {"type": "text", "text": SYSTEM_PROMPT},
    {"type": "text", "text": template, "cache_control": {"type": "ephemeral"}},
]
```

Ephemeral caching (not persistent) is the right choice: no cache management complexity, 5-minute window covers the typical pipeline execution.

### Cerebras doesn't support structured system prompts

Anthropic's SDK accepts system prompts as a list of blocks (for caching). Cerebras (OpenAI-compatible API) only accepts a single string. We flatten list-based prompts before sending:

```python
if isinstance(system, list):
    system = "\n\n".join(block["text"] for block in system if "text" in block)
```

This is a common gotcha when abstracting across providers. The monkeypatch/adapter pattern (swapping `chat` functions per module) works well for this.

### Token distribution is heavily skewed toward crafting

| Step | Input tokens | Output tokens |
|------|-------------|--------------|
| Analyze | ~500-800 | ~1500-2000 |
| Structure | ~800-1200 | ~2000-3000 |
| Craft | ~2000-3000 | ~3000-5000 |

Prompt crafting is the token-intensive step because it synthesizes all upstream context into a detailed image prompt. This is where cost optimization matters most. We allocate 8192 max tokens for crafting vs 4096 for other steps.

### Pre-synthesis threshold: 10,000 characters

Below 10k chars, input passes through unchanged. Above it, we compress to a structured brief preserving all data points verbatim. This prevents overwhelming downstream steps with raw text while maintaining data integrity for short inputs.

---

## 6. Reference System Design

### Markdown as the universal intermediate format

Styles, layouts, analysis frameworks, structured content — everything is markdown. It's:
- Human-readable (you can review and edit style definitions without code)
- LLM-friendly (models are trained on massive amounts of markdown)
- Parseable (regex extraction for specific fields like `title`, `data_type`)
- Cacheable (static files loaded once on startup)

### Style definitions as design DNA

Each style file (~200-400 lines) contains: color palette with specific hex codes, visual element rules, compositional patterns table, visual metaphor mappings, typography instructions, and "Best For" classifications.

This level of specificity is necessary. Generic style descriptions ("Japanese art style") produce generic results. Specific descriptions ("bold sumi ink outlines, flat color areas without gradients, clouds as section dividers") produce distinctive results.

### 20 layouts x 60+ styles = combinatorial richness

Rather than hard-coding a few templates, we built a reference system with ~1200 possible layout/style combinations. The LLM recommends 3 from this space, and the user picks one. This produces variety without randomness.

---

## 7. Error Handling & Resilience

### Retry with exponential backoff is non-negotiable

All LLM calls: 3 attempts, 1-10 second exponential backoff.
Image generation: 3 attempts, 2-20 second exponential backoff (image APIs are flakier).

```python
@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=20))
```

### LLMs wrap JSON in code fences

When asking for JSON output, LLMs frequently wrap the response in ````json ... `````. Always strip code fences before parsing:

```python
if "```json" in text:
    text = text.split("```json")[1].split("```")[0]
```

### Gemini sometimes returns no text

Gemini can return empty responses (safety filters, edge cases). Extract from candidates manually as a fallback:

```python
for c in (response.candidates or []):
    for p in (c.content.parts or []):
        if hasattr(p, "text") and p.text:
            return p.text
```

---

## 8. Benchmarking Methodology

### Control variables for fair comparison

When benchmarking, we fix layout (`hub-spoke`) and style (`ukiyo-e`) to eliminate variability from recommendation randomness. Three topics at different lengths (short ~30 words, medium ~200, long ~2000) cover the input range.

### Benchmark scripts as development tools

We built 4 benchmark scripts:
- **LLM providers**: Claude vs Cerebras vs Gemini for the text pipeline
- **Image providers**: Gemini 3 vs Recraft V3 with identical prompts
- **Model quality**: Full Opus vs full Cerebras pipeline, side-by-side images
- **Pipeline phases**: Before/after comparison when changing pipeline steps

Each generates HTML reports with side-by-side images, timing breakdowns, token counts, and cost calculations. These were essential for making informed model selection decisions rather than relying on intuition.

### Cost per infographic

- Claude Opus pipeline + Gemini image: ~$0.10-0.15
- Cerebras pipeline + Gemini image: ~$0.003-0.005 (including ~$0.02 for image)
- Image generation alone: ~$0.02-0.04

The LLM pipeline cost dwarfs image generation cost with Claude, but becomes negligible with Cerebras.

---

## 9. Anti-Patterns We Avoided

1. **Over-instruction** — System prompts are clear but not verbose. Trust the model to fill gaps.
2. **Context dumping** — Compress upstream, don't concatenate raw.
3. **Format rigidity** — Markdown with flexible structure, not rigid JSON schemas for creative steps.
4. **Role confusion** — One job per LLM call. Don't ask the analyzer to also suggest layouts.
5. **Data mutation** — Source data is sacred. Make the verbatim rule non-negotiable.
6. **Provider lock-in** — Abstract the LLM layer so swapping providers is a function pointer change.
7. **Premature optimization** — We benchmarked first, then chose. Intuition about which model is "best" was often wrong.

---

## 10. Transferable Principles

1. **Decompose complex generation into focused steps** with clear input/output contracts
2. **Use instructional design language** for informational content generation
3. **Visual metaphor mappings** are more effective than generic style instructions
4. **The verbatim rule** — never let LLMs "improve" source data
5. **Dual-mode (fast/detailed)** with the same architecture enables cost/quality tradeoffs
6. **Markdown as intermediate format** — human-readable, LLM-friendly, parseable
7. **Reference systems** (styles, layouts as markdown files) are more maintainable than hardcoded knowledge
8. **Benchmark before deciding** — build comparison tooling, don't rely on intuition
9. **Temperature is a design decision**, not a default — calibrate per step
10. **Prompt caching** is easy and effective for reusable templates
