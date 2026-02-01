import asyncio

from fastapi import APIRouter, HTTPException
from sse_starlette.sse import EventSourceResponse

from sumi.api.schemas import (
    GenerateRequest,
    GenerateResponse,
    JobStatusResponse,
    JobProgress,
    JobResult,
    CombinationRecommendation,
)
from sumi.jobs.manager import job_manager
from sumi.jobs.models import STEP_PROGRESS, STEP_MESSAGES, JobStatus
from sumi.engine.pipeline import run_pipeline

router = APIRouter(prefix="/api", tags=["generation"])


@router.post("/generate", response_model=GenerateResponse)
async def create_generation(request: GenerateRequest):
    job = job_manager.create_job(
        topic=request.topic,
        style_id=request.style_id,
        layout_id=request.layout_id,
        text_labels=request.text_labels,
        aspect_ratio=request.aspect_ratio,
        language=request.language,
    )
    # Launch pipeline as background task
    asyncio.create_task(run_pipeline(job))
    return GenerateResponse(job_id=job.id)


@router.get("/jobs/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str):
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    progress = JobProgress(
        step=job.status.value,
        message=STEP_MESSAGES.get(job.status, ""),
        progress=STEP_PROGRESS.get(job.status, 0),
    )

    result = None
    if job.status == JobStatus.COMPLETED:
        recommendations = None
        if job.recommendations:
            recommendations = [
                CombinationRecommendation(**r) for r in job.recommendations
            ]
        result = JobResult(
            image_url=job.image_url,
            layout_id=job.layout_id,
            layout_name=job.layout_name,
            style_id=job.style_id,
            style_name=job.style_name,
            analysis=job.analysis,
            recommendations=recommendations,
        )

    return JobStatusResponse(
        job_id=job.id,
        status=job.status.value,
        progress=progress,
        result=result,
        error=job.error,
    )


@router.get("/jobs/{job_id}/stream")
async def stream_job(job_id: str):
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return EventSourceResponse(job_manager.sse_generator(job_id))
