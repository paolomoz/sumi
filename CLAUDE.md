# Sumi — Artistic Infographic Generator

## Project Overview

Sumi generates artistic infographics from text topics. Users enter a topic, pick a layout and style, and the pipeline synthesizes, analyzes, structures, crafts a prompt, and generates an image.

## Architecture

Monorepo with two services:

- **`backend/`** — Python/FastAPI. LLM pipeline (Cerebras for fast mode, Claude Opus for detailed mode), image generation (Gemini 3), SQLite DB.
- **`frontend/`** — Next.js (App Router) + TypeScript + Tailwind + shadcn/ui.

## Deployment

Deployed on **Railway** with auto-deploy from `main` branch on GitHub (`paolomoz/sumi`).

- **Two Railway services**: `backend` (root: `backend/`) and `frontend` (root: `frontend/`), each with their own `Dockerfile` and `railway.json`.
- Frontend talks to backend via Railway private networking: `http://backend.railway.internal:8000`
- CORS is configured on the backend to allow the frontend's Railway domain.
- Pushing to `main` triggers automatic builds on both services.
- Setup script: `scripts/railway-setup.sh`

## Local Development

```bash
# Backend
cd backend && python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
uvicorn sumi.main:app --reload

# Frontend
cd frontend && npm install && npm run dev
```

Backend runs on `:8000`, frontend on `:3000`.

## Environment Variables

Configured in `.env` at the repo root (loaded by pydantic-settings). Key variables:

- `ANTHROPIC_API_KEY` — Claude Opus (detailed mode LLM)
- `GOOGLE_API_KEY` — Gemini 3 (image generation)
- `CEREBRAS_API_KEY` — Cerebras (fast mode LLM)
- `FAL_API_KEY` — fal.ai (benchmarking only, not used in production pipeline)
- `AUTH_SECRET` — Shared with NextAuth frontend
- `GITHUB_TOKEN` / `GITHUB_REPO_OWNER` / `GITHUB_REPO_NAME` — Feedback PR integration

On Railway, these are set as service environment variables (not `.env`).

## Key Directories

```
backend/
  sumi/              # Main package
    engine/          # Pipeline: synthesizer, analyzer, structurer, crafter, image_generator
    llm/             # LLM client wrappers (Claude, Cerebras)
    references/      # Style and layout definitions
    config.py        # Settings (pydantic-settings)
    main.py          # FastAPI app
  scripts/           # Benchmark scripts (not part of deployed app)
  output/            # Generated images (gitignored)

frontend/
  src/app/           # Next.js App Router pages
    test/            # Benchmark visualization pages (not linked in nav)

scripts/             # Deployment scripts
```

## Image Generation

Gemini 3 is the image provider for both fast and detailed modes. We benchmarked FLUX.2 Pro (fast but poor text), Ideogram V3 (mediocre text), and Recraft V3 (clean text but too diagrammatic) — Gemini 3 has the best balance of text quality and artistic style adherence.

## Coding Conventions

- Backend: Python 3.11+, ruff for linting (line-length 100), pytest with asyncio_mode="auto"
- Frontend: TypeScript, Next.js App Router, Tailwind CSS, shadcn/ui components
- Commit messages: short imperative summary, body explains "why"
