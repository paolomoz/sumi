import logging
from pathlib import Path

from sumi.config import settings
from sumi.db import get_db
from sumi.jobs.models import Job, JobStatus
from sumi.jobs.manager import job_manager
from sumi.engine.content_analyzer import analyze_content
from sumi.engine.content_structurer import generate_structured_content
from sumi.engine.combination_recommender import recommend_combinations
from sumi.engine.prompt_crafter import craft_prompt
from sumi.engine.image_generator import generate_image
from sumi.references.loader import get_references

logger = logging.getLogger(__name__)


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
    """Execute the full 5-step generation pipeline for a job."""
    try:
        # Step 1: Analyze content
        await job_manager.update_status(job.id, JobStatus.ANALYZING)
        analysis = await analyze_content(job.topic)
        job.analysis = analysis

        # Step 2: Generate structured content
        await job_manager.update_status(job.id, JobStatus.STRUCTURING)
        structured_content = await generate_structured_content(job.topic, analysis)
        job.structured_content = structured_content

        # Step 3: Recommend combinations + select layout/style
        await job_manager.update_status(job.id, JobStatus.RECOMMENDING)
        recommendations = await recommend_combinations(job.topic, analysis)
        job.recommendations = recommendations

        # Select layout and style
        refs = get_references()
        if job.layout_id and job.style_id:
            selected_layout_id = job.layout_id
            selected_style_id = job.style_id
        elif job.layout_id:
            selected_layout_id = job.layout_id
            # Pick style from first recommendation or fallback
            selected_style_id = (
                job.style_id
                or (recommendations[0]["style_id"] if recommendations else "craft-handmade")
            )
        elif job.style_id:
            selected_style_id = job.style_id
            # Pick layout from first recommendation or fallback
            selected_layout_id = (
                recommendations[0]["layout_id"] if recommendations else "bento-grid"
            )
        elif recommendations:
            selected_layout_id = recommendations[0]["layout_id"]
            selected_style_id = recommendations[0]["style_id"]
        else:
            selected_layout_id = "bento-grid"
            selected_style_id = "craft-handmade"

        job.layout_id = selected_layout_id
        job.style_id = selected_style_id

        layout = refs.get_layout(selected_layout_id)
        style = refs.get_style(selected_style_id)
        job.layout_name = layout.name if layout else selected_layout_id
        job.style_name = style.name if style else selected_style_id

        # Step 4: Craft prompt (LLM-assisted creative synthesis)
        await job_manager.update_status(job.id, JobStatus.CRAFTING)
        analysis_md = analysis.get("analysis_markdown", "") if isinstance(analysis, dict) else str(analysis)
        prompt = await craft_prompt(
            layout_id=selected_layout_id,
            style_id=selected_style_id,
            structured_content=structured_content,
            topic=job.topic,
            analysis=analysis_md,
            aspect_ratio=job.aspect_ratio,
            language=job.language,
        )
        job.prompt = prompt

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
