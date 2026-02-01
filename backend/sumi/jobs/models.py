from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime


class JobStatus(str, Enum):
    QUEUED = "queued"
    ANALYZING = "analyzing"
    STRUCTURING = "structuring"
    RECOMMENDING = "recommending"
    CRAFTING = "crafting"
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"


STEP_PROGRESS = {
    JobStatus.QUEUED: 0.0,
    JobStatus.ANALYZING: 0.1,
    JobStatus.STRUCTURING: 0.25,
    JobStatus.RECOMMENDING: 0.4,
    JobStatus.CRAFTING: 0.55,
    JobStatus.GENERATING: 0.7,
    JobStatus.COMPLETED: 1.0,
    JobStatus.FAILED: 0.0,
}

STEP_MESSAGES = {
    JobStatus.QUEUED: "Waiting in queue...",
    JobStatus.ANALYZING: "Analyzing your topic...",
    JobStatus.STRUCTURING: "Structuring content for the designer...",
    JobStatus.RECOMMENDING: "Finding the best layout × style combinations...",
    JobStatus.CRAFTING: "Crafting image generation prompt...",
    JobStatus.GENERATING: "Generating infographic with Imagen 4...",
    JobStatus.COMPLETED: "Your infographic is ready!",
    JobStatus.FAILED: "Generation failed",
}


@dataclass
class Job:
    id: str
    topic: str
    style_id: str | None = None
    layout_id: str | None = None
    text_labels: list[str] | None = None
    aspect_ratio: str = "9:16"
    language: str = "English"
    status: JobStatus = JobStatus.QUEUED
    error: str | None = None
    created_at: datetime = field(default_factory=datetime.utcnow)

    # Results populated during pipeline
    analysis: dict | None = None
    structured_content: str | None = None
    recommendations: list[dict] | None = None
    prompt: str | None = None
    image_url: str | None = None
    layout_name: str | None = None
    style_name: str | None = None
