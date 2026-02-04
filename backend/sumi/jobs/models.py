import asyncio
from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime


class JobStatus(str, Enum):
    QUEUED = "queued"
    ANALYZING = "analyzing"
    STRUCTURING = "structuring"
    RECOMMENDING = "recommending"
    AWAITING_SELECTION = "awaiting_selection"
    CRAFTING = "crafting"
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"


STEP_PROGRESS = {
    JobStatus.QUEUED: 0.0,
    JobStatus.ANALYZING: 0.1,
    JobStatus.STRUCTURING: 0.25,
    JobStatus.RECOMMENDING: 0.4,
    JobStatus.AWAITING_SELECTION: 0.45,
    JobStatus.CRAFTING: 0.55,
    JobStatus.GENERATING: 0.7,
    JobStatus.COMPLETED: 1.0,
    JobStatus.FAILED: 0.0,
}

STEP_MESSAGES = {
    JobStatus.QUEUED: "Waiting in queue...",
    JobStatus.ANALYZING: "Reading through your topic...",
    JobStatus.STRUCTURING: "Organizing the key information...",
    JobStatus.RECOMMENDING: "Exploring visual styles...",
    JobStatus.AWAITING_SELECTION: "Pick a style, or I'll go with the best match...",
    JobStatus.CRAFTING: "Writing the design prompt...",
    JobStatus.GENERATING: "Painting your infographic...",
    JobStatus.COMPLETED: "Your infographic is ready!",
    JobStatus.FAILED: "Generation failed",
}

# Restyle pipeline: shorter progress (skips analysis/structuring/recommending)
RESTYLE_STEP_PROGRESS = {
    JobStatus.QUEUED: 0.0,
    JobStatus.CRAFTING: 0.2,
    JobStatus.GENERATING: 0.5,
    JobStatus.COMPLETED: 1.0,
    JobStatus.FAILED: 0.0,
}

RESTYLE_STEP_MESSAGES = {
    JobStatus.QUEUED: "Waiting in queue...",
    JobStatus.CRAFTING: "Crafting image generation prompt...",
    JobStatus.GENERATING: "Generating infographic with Nano Banana Pro 🍌...",
    JobStatus.COMPLETED: "Your infographic is ready!",
    JobStatus.FAILED: "Generation failed",
}


@dataclass
class Job:
    id: str
    topic: str
    user_id: str | None = None
    style_id: str | None = None
    layout_id: str | None = None
    text_labels: list[str] | None = None
    aspect_ratio: str = "16:9"
    language: str = "English"
    status: JobStatus = JobStatus.QUEUED
    error: str | None = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    source_job_id: str | None = None

    # Results populated during pipeline
    analysis: dict | None = None
    structured_content: str | None = None
    recommendations: list[dict] | None = None
    prompt: str | None = None
    image_url: str | None = None
    layout_name: str | None = None
    style_name: str | None = None

    # Selection pause support (not serialized)
    selection_event: asyncio.Event | None = field(default=None, repr=False)
    confirmed_layout_id: str | None = None
    confirmed_style_id: str | None = None
