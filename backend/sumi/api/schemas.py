from pydantic import BaseModel, Field


# --- Layouts ---

class LayoutResponse(BaseModel):
    id: str
    name: str
    best_for: list[str]
    recommended_pairings: list[str]


class LayoutDetailResponse(LayoutResponse):
    content: str


# --- Styles ---

class StyleResponse(BaseModel):
    id: str
    name: str
    best_for: str


class StyleDetailResponse(StyleResponse):
    content: str


# --- Combinations ---

class CombinationRecommendation(BaseModel):
    layout_id: str
    layout_name: str
    style_id: str
    style_name: str
    rationale: str
    approach: str


class RecommendRequest(BaseModel):
    topic: str = Field(..., min_length=3, max_length=2000)


class RecommendResponse(BaseModel):
    recommendations: list[CombinationRecommendation]


# --- Generation ---

class GenerateRequest(BaseModel):
    topic: str = Field(..., min_length=3, max_length=2000)
    style_id: str | None = None
    layout_id: str | None = None
    text_labels: list[str] | None = None
    aspect_ratio: str = "9:16"
    language: str = "English"


class GenerateResponse(BaseModel):
    job_id: str


class JobProgress(BaseModel):
    step: str
    message: str
    progress: float  # 0.0 to 1.0


class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    progress: JobProgress | None = None
    result: "JobResult | None" = None
    error: str | None = None


class JobResult(BaseModel):
    image_url: str | None = None
    layout_id: str | None = None
    layout_name: str | None = None
    style_id: str | None = None
    style_name: str | None = None
    analysis: dict | None = None
    recommendations: list[CombinationRecommendation] | None = None


# --- Health ---

class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "0.1.0"
