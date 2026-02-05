from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime


class FeedbackStatus(str, Enum):
    PENDING = "pending"
    CATEGORIZING = "categorizing"
    GENERATING = "generating"
    CREATING_PR = "creating_pr"
    COMPLETED = "completed"
    REJECTED = "rejected"
    FAILED = "failed"


class FeedbackCategory(str, Enum):
    BUG = "bug"
    FEATURE_REQUEST = "feature_request"
    IMPROVEMENT = "improvement"
    THANK_YOU = "thank_you"
    QUESTION = "question"
    OTHER = "other"


STEP_PROGRESS = {
    FeedbackStatus.PENDING: 0.0,
    FeedbackStatus.CATEGORIZING: 0.15,
    FeedbackStatus.GENERATING: 0.4,
    FeedbackStatus.CREATING_PR: 0.75,
    FeedbackStatus.COMPLETED: 1.0,
    FeedbackStatus.REJECTED: 1.0,
    FeedbackStatus.FAILED: 0.0,
}

STEP_MESSAGES = {
    FeedbackStatus.PENDING: "Received your feedback...",
    FeedbackStatus.CATEGORIZING: "Analyzing your feedback...",
    FeedbackStatus.GENERATING: "Generating code changes...",
    FeedbackStatus.CREATING_PR: "Creating pull request...",
    FeedbackStatus.COMPLETED: "Done!",
    FeedbackStatus.REJECTED: "Thanks for your feedback!",
    FeedbackStatus.FAILED: "Something went wrong",
}


@dataclass
class LLMAnalysis:
    category: FeedbackCategory
    is_actionable: bool
    summary: str
    affected_areas: list[str] = field(default_factory=list)
    reasoning: str = ""


@dataclass
class CodeChange:
    file_path: str
    action: str  # "modify", "create", "delete"
    original_content: str | None
    new_content: str
    explanation: str


@dataclass
class Feedback:
    id: str
    content: str
    user_id: str | None = None
    category: FeedbackCategory | None = None
    is_actionable: bool = False
    status: FeedbackStatus = FeedbackStatus.PENDING
    pr_url: str | None = None
    pr_branch: str | None = None
    llm_analysis: LLMAnalysis | None = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime | None = None
    error: str | None = None

    # Runtime fields (not persisted)
    code_changes: list[CodeChange] = field(default_factory=list)
    pr_title: str | None = None
    pr_description: str | None = None
