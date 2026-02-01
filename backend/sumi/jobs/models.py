from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime


class JobStatus(str, Enum):
    QUEUED = "queued"
    ANALYZING = "analyzing"
    RECOMMENDING = "recommending"
    CRAFTING = "crafting"
    GENERATING_BASE = "generating_base"
    GENERATING_TEXT = "generating_text"
    COMPLETED = "completed"
    FAILED = "failed"


STEP_PROGRESS = {
    JobStatus.QUEUED: 0.0,
    JobStatus.ANALYZING: 0.1,
    JobStatus.RECOMMENDING: 0.25,
    JobStatus.CRAFTING: 0.4,
    JobStatus.GENERATING_BASE: 0.55,
    JobStatus.GENERATING_TEXT: 0.75,
    JobStatus.COMPLETED: 1.0,
    JobStatus.FAILED: 0.0,
}

STEP_MESSAGES = {
    JobStatus.QUEUED: "Waiting in queue...",
    JobStatus.ANALYZING: "Analyzing your topic...",
    JobStatus.RECOMMENDING: "Finding the best artistic styles...",
    JobStatus.CRAFTING: "Crafting image generation prompts...",
    JobStatus.GENERATING_BASE: "Generating artistic base image with Imagen 4...",
    JobStatus.GENERATING_TEXT: "Rendering text with Ideogram V3...",
    JobStatus.COMPLETED: "Your infographic is ready!",
    JobStatus.FAILED: "Generation failed",
}


@dataclass
class Job:
    id: str
    topic: str
    style_id: str | None = None
    text_labels: list[str] | None = None
    aspect_ratio: str = "9:16"
    output_mode: str = "visual"
    status: JobStatus = JobStatus.QUEUED
    error: str | None = None
    created_at: datetime = field(default_factory=datetime.utcnow)

    # Results populated during pipeline
    analysis: dict | None = None
    recommendations: list[dict] | None = None
    imagen_prompt: str | None = None
    ideogram_prompt: str | None = None
    base_image_url: str | None = None
    final_image_url: str | None = None
    style_name: str | None = None
