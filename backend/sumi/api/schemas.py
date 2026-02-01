from pydantic import BaseModel, Field


# --- Styles ---

class StyleResponse(BaseModel):
    id: str
    name: str
    category: str
    rating: int
    mood: list[str]
    color_palette: list[str]
    best_for: list[str]
    has_guide: bool
    description: str


class StyleDetailResponse(StyleResponse):
    guide: str | None = None


class StyleRecommendation(BaseModel):
    style_id: str
    style_name: str
    rationale: str
    approach: str


class RecommendRequest(BaseModel):
    topic: str = Field(..., min_length=3, max_length=2000)


class RecommendResponse(BaseModel):
    recommendations: list[StyleRecommendation]


# --- Generation ---

class GenerateRequest(BaseModel):
    topic: str = Field(..., min_length=3, max_length=2000)
    style_id: str | None = None
    text_labels: list[str] | None = None
    aspect_ratio: str = "9:16"
    output_mode: str = "visual"  # "visual" or "textual"


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
    base_image_url: str | None = None
    final_image_url: str | None = None
    style_id: str | None = None
    style_name: str | None = None
    analysis: dict | None = None
    recommendations: list[StyleRecommendation] | None = None


# --- Health ---

class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "0.1.0"
