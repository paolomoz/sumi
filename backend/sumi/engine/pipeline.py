import asyncio
import logging
import time
from pathlib import Path

from sumi.config import settings
from sumi.db import get_db
from sumi.jobs.models import Job, JobStatus
from sumi.jobs.manager import job_manager
from sumi.engine.content_synthesizer import synthesize_if_needed
from sumi.engine.content_analyzer import analyze_content
from sumi.engine.content_structurer import generate_structured_content
from sumi.engine.prompt_crafter import craft_prompt
from sumi.engine.image_generator import generate_image
from sumi.references.loader import get_references

logger = logging.getLogger(__name__)

# No timeout – user must always select a style manually


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
        timings: dict[str, float] = {}

        # Step 0: Pre-synthesize long content
        t0 = time.monotonic()
        topic = await synthesize_if_needed(job.topic, mode=job.mode)
        timings["pre_synthesis"] = time.monotonic() - t0

        # Step 1: Analyze content
        await job_manager.update_status(job.id, JobStatus.ANALYZING)
        t0 = time.monotonic()
        analysis = await analyze_content(topic, mode=job.mode)
        timings["analysis"] = time.monotonic() - t0
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
        t0 = time.monotonic()
        structured_content = await generate_structured_content(topic, analysis, mode=job.mode)
        timings["structuring"] = time.monotonic() - t0
        job.structured_content = structured_content

        # Emit structuring step data
        await job_manager.send_step_data(job.id, "structuring", {
            "preview": (structured_content or "")[:300],
        })

        # --- Selection pause: user must pick style + layout ---
        job.selection_event = asyncio.Event()
        await job_manager.update_status(job.id, JobStatus.AWAITING_SELECTION)

        await job.selection_event.wait()
        logger.info("Job %s: user confirmed selection", job.id)

        selected_layout_id = job.confirmed_layout_id
        selected_style_id = job.confirmed_style_id
        job.selection_event = None

        if not selected_layout_id or not selected_style_id:
            raise ValueError("Both layout_id and style_id are required for selection")

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
        t0 = time.monotonic()
        prompt = await craft_prompt(
            layout_id=selected_layout_id,
            style_id=selected_style_id,
            structured_content=structured_content,
            topic=topic,
            analysis=analysis_md,
            aspect_ratio=job.aspect_ratio,
            language=job.language,
            mode=job.mode,
        )
        timings["crafting"] = time.monotonic() - t0
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

        t0 = time.monotonic()
        image_path = str(output_dir / "infographic.png")
        actual_path = await generate_image(
            prompt=prompt,
            output_path=image_path,
            aspect_ratio=job.aspect_ratio,
        )
        timings["image_generation"] = time.monotonic() - t0
        # Use the actual filename (extension may differ from .png)
        actual_name = Path(actual_path).name
        job.image_url = f"/output/{job.id}/{actual_name}"

        # Log timing summary
        timings["total"] = sum(timings.values())
        logger.info("Pipeline timings for %s: %s", job.id, timings)

        # Emit timings as step_data for comparison page
        await job_manager.send_step_data(job.id, "timings", timings)

        # Done
        await job_manager.update_status(job.id, JobStatus.COMPLETED)
        await _save_generation(job)

    except Exception as e:
        error_msg = _extract_error_message(e)
        await job_manager.update_status(job.id, JobStatus.FAILED, error=error_msg)
        raise


def _extract_error_message(exc: Exception) -> str:
    """Unwrap RetryError and other wrappers to get a human-readable message."""
    from tenacity import RetryError

    if isinstance(exc, RetryError):
        # Extract the last attempt's underlying exception
        last = exc.last_attempt
        if last and last.failed:
            cause = last.exception()
            if cause:
                return f"Generation failed after retries: {cause}"
        return "Generation failed after multiple retries"
    return str(exc)


async def run_restyle_pipeline(job: Job):
    """Execute a shorter pipeline for restyling: only crafting + image generation.

    Assumes job already has analysis and structured_content
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
            mode=job.mode,
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
        error_msg = _extract_error_message(e)
        await job_manager.update_status(job.id, JobStatus.FAILED, error=error_msg)
        raise
