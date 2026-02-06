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
    topic: str = Field(..., min_length=3, max_length=50000)


class RecommendResponse(BaseModel):
    recommendations: list[CombinationRecommendation]


# --- Generation ---

class GenerateRequest(BaseModel):
    topic: str = Field(..., min_length=3, max_length=50000)
    style_id: str | None = None
    layout_id: str | None = None
    text_labels: list[str] | None = None
    aspect_ratio: str = "16:9"
    language: str = "English"
    mode: str = "detailed"


class RestyleRequest(BaseModel):
    style_id: str
    layout_id: str | None = None
    aspect_ratio: str = "16:9"
    language: str = "English"
    mode: str = "detailed"


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
    step_data: dict | None = None
    topic: str | None = None


class JobResult(BaseModel):
    image_url: str | None = None
    layout_id: str | None = None
    layout_name: str | None = None
    style_id: str | None = None
    style_name: str | None = None
    analysis: dict | None = None
    mode: str | None = None


class ConfirmSelectionRequest(BaseModel):
    layout_id: str
    style_id: str


# --- Health ---

class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "0.1.0"


# --- Feedback ---

class FeedbackRequest(BaseModel):
    content: str = Field(..., min_length=20, max_length=2000)


class FeedbackResponse(BaseModel):
    feedback_id: str


class FeedbackStatusResponse(BaseModel):
    feedback_id: str
    status: str
    category: str | None = None
    is_actionable: bool = False
    pr_url: str | None = None
    pr_branch: str | None = None
    error: str | None = None
