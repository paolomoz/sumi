import asyncio
from pathlib import Path

from sumi.config import settings
from sumi.jobs.models import Job, JobStatus
from sumi.jobs.manager import job_manager
from sumi.engine.content_analyzer import analyze_content
from sumi.engine.style_recommender import recommend_styles
from sumi.engine.prompt_crafter import craft_prompts
from sumi.engine.imagen_generator import generate_base_image
from sumi.engine.ideogram_generator import generate_text_overlay
from sumi.catalog.styles import get_catalog


async def run_pipeline(job: Job):
    """Execute the full generation pipeline for a job."""
    try:
        # Step 1: Analyze content
        await job_manager.update_status(job.id, JobStatus.ANALYZING)
        analysis = await analyze_content(job.topic)
        job.analysis = analysis

        # Step 2: Recommend styles (if no style selected)
        await job_manager.update_status(job.id, JobStatus.RECOMMENDING)
        recommendations = await recommend_styles(job.topic, analysis=analysis)
        job.recommendations = recommendations

        # Select style
        if job.style_id:
            selected_style_id = job.style_id
        elif recommendations:
            selected_style_id = recommendations[0]["style_id"]
        else:
            selected_style_id = "ukiyo-e"  # fallback

        job.style_id = selected_style_id
        catalog = get_catalog()
        style = catalog.get(selected_style_id)
        job.style_name = style.name if style else selected_style_id

        # Step 3: Craft prompts
        await job_manager.update_status(job.id, JobStatus.CRAFTING)
        text_labels = job.text_labels or analysis.get("text_labels", [])
        prompts = await craft_prompts(analysis, selected_style_id, text_labels)
        job.imagen_prompt = prompts["imagen_prompt"]
        job.ideogram_prompt = prompts["ideogram_prompt"]

        aspect_ratio = prompts.get("aspect_ratio", job.aspect_ratio)

        # Step 4: Generate base image with Imagen 4
        await job_manager.update_status(job.id, JobStatus.GENERATING_BASE)
        output_dir = Path(settings.output_dir) / job.id
        output_dir.mkdir(parents=True, exist_ok=True)

        base_path = str(output_dir / "base.png")
        await generate_base_image(
            prompt=job.imagen_prompt,
            output_path=base_path,
            aspect_ratio=aspect_ratio,
        )
        job.base_image_url = f"/output/{job.id}/base.png"

        # Step 5: Generate final image with Ideogram V3
        await job_manager.update_status(job.id, JobStatus.GENERATING_TEXT)
        final_path = str(output_dir / "final.png")
        await generate_text_overlay(
            prompt=job.ideogram_prompt,
            style_reference_path=base_path,
            output_path=final_path,
            aspect_ratio=aspect_ratio,
        )
        job.final_image_url = f"/output/{job.id}/final.png"

        # Done
        await job_manager.update_status(job.id, JobStatus.COMPLETED)

    except Exception as e:
        await job_manager.update_status(job.id, JobStatus.FAILED, error=str(e))
        raise
