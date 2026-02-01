from pathlib import Path

from sumi.config import settings
from sumi.jobs.models import Job, JobStatus
from sumi.jobs.manager import job_manager
from sumi.engine.content_analyzer import analyze_content
from sumi.engine.content_structurer import generate_structured_content
from sumi.engine.combination_recommender import recommend_combinations
from sumi.engine.prompt_crafter import craft_prompt
from sumi.engine.image_generator import generate_image
from sumi.references.loader import get_references


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

        # Step 4: Craft prompt (synchronous — no LLM call)
        await job_manager.update_status(job.id, JobStatus.CRAFTING)
        prompt = craft_prompt(
            layout_id=selected_layout_id,
            style_id=selected_style_id,
            structured_content=structured_content,
            aspect_ratio=job.aspect_ratio,
            language=job.language,
        )
        job.prompt = prompt

        # Step 5: Generate image
        await job_manager.update_status(job.id, JobStatus.GENERATING)
        output_dir = Path(settings.output_dir) / job.id
        output_dir.mkdir(parents=True, exist_ok=True)

        image_path = str(output_dir / "infographic.png")
        await generate_image(
            prompt=prompt,
            output_path=image_path,
            aspect_ratio=job.aspect_ratio,
        )
        job.image_url = f"/output/{job.id}/infographic.png"

        # Done
        await job_manager.update_status(job.id, JobStatus.COMPLETED)

    except Exception as e:
        await job_manager.update_status(job.id, JobStatus.FAILED, error=str(e))
        raise
