import asyncio
import logging
from pathlib import Path

from sumi.config import settings
from sumi.db import get_db
from sumi.jobs.models import Job, JobStatus
from sumi.jobs.manager import job_manager
from sumi.engine.content_synthesizer import synthesize_if_needed
from sumi.engine.content_analyzer import analyze_content
from sumi.engine.content_structurer import generate_structured_content
from sumi.engine.combination_recommender import recommend_combinations
from sumi.engine.prompt_crafter import craft_prompt
from sumi.engine.image_generator import generate_image
from sumi.references.loader import get_references

logger = logging.getLogger(__name__)

SELECTION_TIMEOUT = 8  # seconds to wait for user selection


async def _save_generation(job: Job) -> None:
    """Persist a completed generation to the database for history."""
    if not job.user_id:
        return
    try:
        db = get_db()
        await db.execute(
            """INSERT OR REPLACE INTO generations
               (id, user_id, topic, style_id, style_name, layout_id, layout_name,
                image_url, aspect_ratio, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                job.id,
                job.user_id,
                job.topic,
                job.style_id,
                job.style_name,
                job.layout_id,
                job.layout_name,
                job.image_url,
                job.aspect_ratio,
                job.created_at.isoformat(),
            ),
        )
        await db.commit()
    except Exception:
        logger.exception("Failed to save generation %s to database", job.id)


async def run_pipeline(job: Job):
    """Execute the full generation pipeline for a job."""
    try:
        # Step 0: Pre-synthesize long content
        topic = await synthesize_if_needed(job.topic)

        # Step 1: Analyze content
        await job_manager.update_status(job.id, JobStatus.ANALYZING)
        analysis = await analyze_content(topic)
        job.analysis = analysis

        # Emit analysis step data
        await job_manager.send_step_data(job.id, "analyzing", {
            "title": analysis.get("title", ""),
            "data_type": analysis.get("data_type", ""),
            "complexity": analysis.get("complexity", ""),
            "preview": (analysis.get("analysis_markdown", "") or "")[:300],
        })

        # Step 2: Generate structured content
        await job_manager.update_status(job.id, JobStatus.STRUCTURING)
        structured_content = await generate_structured_content(topic, analysis)
        job.structured_content = structured_content

        # Emit structuring step data
        await job_manager.send_step_data(job.id, "structuring", {
            "preview": (structured_content or "")[:300],
        })

        # Step 3: Recommend combinations + select layout/style
        await job_manager.update_status(job.id, JobStatus.RECOMMENDING)
        recommendations = await recommend_combinations(topic, analysis)
        job.recommendations = recommendations

        # Emit recommendations step data
        await job_manager.send_step_data(job.id, "recommending", {
            "recommendations": recommendations,
        })

        # --- Selection pause logic ---
        # If user already provided both style_id and layout_id, skip pause
        if job.style_id and job.layout_id:
            selected_layout_id = job.layout_id
            selected_style_id = job.style_id
        elif job.style_id:
            # Style pre-selected (e.g. "Create Similar") — pick best layout, skip pause
            selected_style_id = job.style_id
            # Find a recommended layout that pairs with this style, or fall back
            selected_layout_id = "bento-grid"
            if recommendations:
                for rec in recommendations:
                    if rec.get("style_id") == job.style_id:
                        selected_layout_id = rec["layout_id"]
                        break
                else:
                    selected_layout_id = recommendations[0]["layout_id"]
        else:
            # Auto-select best_match as default
            if recommendations:
                default_layout_id = recommendations[0]["layout_id"]
                default_style_id = recommendations[0]["style_id"]
            else:
                default_layout_id = "bento-grid"
                default_style_id = "craft-handmade"

            # Store defaults on job
            job.confirmed_layout_id = default_layout_id
            job.confirmed_style_id = default_style_id

            # Pause: set status to AWAITING_SELECTION and wait for user or timeout
            job.selection_event = asyncio.Event()
            await job_manager.update_status(job.id, JobStatus.AWAITING_SELECTION)

            try:
                await asyncio.wait_for(job.selection_event.wait(), timeout=SELECTION_TIMEOUT)
                logger.info("Job %s: user confirmed selection", job.id)
            except asyncio.TimeoutError:
                logger.info("Job %s: selection timeout, using default best_match", job.id)

            # Use whatever was confirmed (user override or default)
            selected_layout_id = job.confirmed_layout_id
            selected_style_id = job.confirmed_style_id
            job.selection_event = None

        job.layout_id = selected_layout_id
        job.style_id = selected_style_id

        refs = get_references()
        layout = refs.get_layout(selected_layout_id)
        style = refs.get_style(selected_style_id)
        job.layout_name = layout.name if layout else selected_layout_id
        job.style_name = style.name if style else selected_style_id

        # Emit the actual selection so the frontend can display it correctly
        await job_manager.send_step_data(job.id, "selection", {
            "style_id": selected_style_id,
            "style_name": job.style_name,
            "layout_id": selected_layout_id,
            "layout_name": job.layout_name,
        })

        # Step 4: Craft prompt (LLM-assisted creative synthesis)
        await job_manager.update_status(job.id, JobStatus.CRAFTING)
        analysis_md = analysis.get("analysis_markdown", "") if isinstance(analysis, dict) else str(analysis)
        prompt = await craft_prompt(
            layout_id=selected_layout_id,
            style_id=selected_style_id,
            structured_content=structured_content,
            topic=topic,
            analysis=analysis_md,
            aspect_ratio=job.aspect_ratio,
            language=job.language,
        )
        job.prompt = prompt

        # Emit crafting step data
        await job_manager.send_step_data(job.id, "crafting", {
            "preview": (prompt or "")[:300],
        })

        # Step 5: Generate image
        await job_manager.update_status(job.id, JobStatus.GENERATING)
        output_dir = Path(settings.output_dir) / job.id
        output_dir.mkdir(parents=True, exist_ok=True)

        # Save prompt for debugging
        (output_dir / "prompt.md").write_text(prompt, encoding="utf-8")

        image_path = str(output_dir / "infographic.png")
        actual_path = await generate_image(
            prompt=prompt,
            output_path=image_path,
            aspect_ratio=job.aspect_ratio,
        )
        # Use the actual filename (extension may differ from .png)
        actual_name = Path(actual_path).name
        job.image_url = f"/output/{job.id}/{actual_name}"

        # Done
        await job_manager.update_status(job.id, JobStatus.COMPLETED)
        await _save_generation(job)

    except Exception as e:
        await job_manager.update_status(job.id, JobStatus.FAILED, error=str(e))
        raise


async def run_restyle_pipeline(job: Job):
    """Execute a shorter pipeline for restyling: only crafting + image generation.

    Assumes job already has analysis, structured_content, and recommendations
    pre-populated from the source job.
    """
    try:
        # Resolve layout and style
        refs = get_references()

        selected_layout_id = job.layout_id or "bento-grid"
        selected_style_id = job.style_id or "craft-handmade"

        job.layout_id = selected_layout_id
        job.style_id = selected_style_id

        layout = refs.get_layout(selected_layout_id)
        style = refs.get_style(selected_style_id)
        job.layout_name = layout.name if layout else selected_layout_id
        job.style_name = style.name if style else selected_style_id

        # Step 1: Craft prompt
        await job_manager.update_status(job.id, JobStatus.CRAFTING)
        analysis_md = (
            job.analysis.get("analysis_markdown", "")
            if isinstance(job.analysis, dict)
            else str(job.analysis or "")
        )
        prompt = await craft_prompt(
            layout_id=selected_layout_id,
            style_id=selected_style_id,
            structured_content=job.structured_content,
            topic=job.topic,
            analysis=analysis_md,
            aspect_ratio=job.aspect_ratio,
            language=job.language,
        )
        job.prompt = prompt

        # Step 2: Generate image
        await job_manager.update_status(job.id, JobStatus.GENERATING)
        output_dir = Path(settings.output_dir) / job.id
        output_dir.mkdir(parents=True, exist_ok=True)

        (output_dir / "prompt.md").write_text(prompt, encoding="utf-8")

        image_path = str(output_dir / "infographic.png")
        actual_path = await generate_image(
            prompt=prompt,
            output_path=image_path,
            aspect_ratio=job.aspect_ratio,
        )
        actual_name = Path(actual_path).name
        job.image_url = f"/output/{job.id}/{actual_name}"

        await job_manager.update_status(job.id, JobStatus.COMPLETED)
        await _save_generation(job)

    except Exception as e:
        await job_manager.update_status(job.id, JobStatus.FAILED, error=str(e))
        raise
