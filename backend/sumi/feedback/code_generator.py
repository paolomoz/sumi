"""LLM-based code generation for feedback-driven changes."""

import logging
import re
from pathlib import Path

from sumi.llm.client import chat_json
from sumi.feedback.models import Feedback, LLMAnalysis, CodeChange
from sumi.config import settings

logger = logging.getLogger(__name__)

# Project root for file operations
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent

# Blocked file patterns (security)
BLOCKED_PATTERNS = [
    r"\.env.*",
    r".*credentials.*",
    r".*secret.*",
    r"package\.json$",
    r"package-lock\.json$",
    r"requirements\.txt$",
    r"pyproject\.toml$",
    r"poetry\.lock$",
    r"\.git/.*",
    r"node_modules/.*",
    r"__pycache__/.*",
]

# Allowed directories for changes
ALLOWED_DIRECTORIES = [
    "frontend/src/components",
    "frontend/src/app",
    "frontend/src/lib",
    "frontend/src/styles",
    "backend/sumi/api",
    "backend/sumi/jobs",
    "backend/sumi/llm",
    "backend/sumi/feedback",
]

CODE_GENERATION_SYSTEM = """You are an expert software engineer tasked with implementing changes to a web application.

The application is called Sumi - an infographic generator. The tech stack is:
- Frontend: Next.js 14, React, TypeScript, Tailwind CSS, shadcn/ui
- Backend: Python 3.11+, FastAPI, SQLite (aiosqlite)

You will be given:
1. User feedback describing an issue or improvement
2. Analysis of the feedback
3. Relevant source files from the codebase

Your task is to generate code changes that address the feedback. Guidelines:
- Make minimal, focused changes that directly address the feedback
- Follow existing code patterns and styles in the project
- Do not change unrelated code
- Do not add unnecessary features or refactoring
- Keep changes simple and reviewable

Respond with a JSON object in this exact format:
{
  "changes": [
    {
      "file_path": "relative/path/to/file.tsx",
      "action": "modify",
      "original_content": "exact content being replaced (for modify only)",
      "new_content": "new content to insert",
      "explanation": "why this change addresses the feedback"
    }
  ],
  "title": "Short PR title (max 60 chars)",
  "description": "Detailed PR description in markdown"
}

Actions:
- "modify": Change existing content (requires original_content)
- "create": Create a new file (original_content should be null)

Important:
- For "modify", original_content must be an EXACT substring of the current file
- Include enough context in original_content to uniquely identify the location
- Keep changes minimal - don't rewrite entire files
- Maximum 5 files per PR"""


def is_path_allowed(file_path: str) -> bool:
    """Check if a file path is allowed for modification."""
    # Check blocked patterns
    for pattern in BLOCKED_PATTERNS:
        if re.match(pattern, file_path, re.IGNORECASE):
            logger.warning("Blocked file pattern: %s", file_path)
            return False

    # Check allowed directories
    for allowed_dir in ALLOWED_DIRECTORIES:
        if file_path.startswith(allowed_dir):
            return True

    logger.warning("File not in allowed directory: %s", file_path)
    return False


def read_project_file(file_path: str) -> str | None:
    """Read a file from the project."""
    full_path = PROJECT_ROOT / file_path
    if not full_path.exists():
        return None
    try:
        return full_path.read_text()
    except Exception as e:
        logger.error("Failed to read %s: %s", file_path, e)
        return None


def get_project_structure() -> str:
    """Get a simplified project structure for context."""
    structure = []

    # Frontend components
    frontend_components = PROJECT_ROOT / "frontend" / "src" / "components"
    if frontend_components.exists():
        for path in sorted(frontend_components.rglob("*.tsx"))[:20]:
            rel = path.relative_to(PROJECT_ROOT)
            structure.append(str(rel))

    # Backend API
    backend_api = PROJECT_ROOT / "backend" / "sumi" / "api"
    if backend_api.exists():
        for path in sorted(backend_api.rglob("*.py"))[:10]:
            rel = path.relative_to(PROJECT_ROOT)
            structure.append(str(rel))

    return "\n".join(structure)


def get_relevant_files(affected_areas: list[str], feedback_content: str) -> dict[str, str]:
    """Get content of files relevant to the affected areas and feedback."""
    files = {}
    max_files = 5
    max_chars_per_file = 4000

    # Try to identify specific files mentioned or related to the feedback
    feedback_lower = feedback_content.lower()

    # Map keywords to specific files
    keyword_files = {
        "feedback button": "frontend/src/components/feedback/feedback-button.tsx",
        "feedback dialog": "frontend/src/components/feedback/feedback-dialog.tsx",
        "sidebar": "frontend/src/components/layout/sidebar.tsx",
        "topic input": "frontend/src/components/home/topic-input.tsx",
        "main content": "frontend/src/components/layout/main-content.tsx",
        "top bar": "frontend/src/components/layout/top-bar.tsx",
        "header": "frontend/src/components/layout/top-bar.tsx",
    }

    # Add files matching keywords in feedback
    for keyword, file_path in keyword_files.items():
        if keyword in feedback_lower and len(files) < max_files:
            content = read_project_file(file_path)
            if content:
                if len(content) > max_chars_per_file:
                    content = content[:max_chars_per_file] + "\n... (truncated)"
                files[file_path] = content

    # Add files based on affected areas
    for area in affected_areas:
        if len(files) >= max_files:
            break

        if area == "frontend/components":
            key_files = [
                "frontend/src/components/feedback/feedback-button.tsx",
                "frontend/src/components/feedback/feedback-dialog.tsx",
                "frontend/src/components/layout/main-content.tsx",
            ]
        elif area == "frontend/styles":
            key_files = ["frontend/src/app/globals.css"]
        elif area == "backend/api":
            key_files = [
                "backend/sumi/api/router.py",
                "backend/sumi/api/generate.py",
            ]
        else:
            continue

        for file_path in key_files:
            if len(files) >= max_files:
                break
            if file_path not in files:
                content = read_project_file(file_path)
                if content:
                    if len(content) > max_chars_per_file:
                        content = content[:max_chars_per_file] + "\n... (truncated)"
                    files[file_path] = content

    return files


def normalize_whitespace(text: str) -> str:
    """Normalize whitespace for fuzzy matching."""
    import re
    # Normalize line endings and collapse multiple spaces
    text = re.sub(r'\r\n', '\n', text)
    text = re.sub(r'[ \t]+', ' ', text)
    return text.strip()


def find_best_match(needle: str, haystack: str) -> str | None:
    """Find the best matching substring in haystack for needle.

    Returns the actual substring from haystack that best matches needle,
    or None if no good match is found.
    """
    # Try exact match first
    if needle in haystack:
        return needle

    # Try normalized match
    norm_needle = normalize_whitespace(needle)
    norm_haystack = normalize_whitespace(haystack)

    if norm_needle in norm_haystack:
        # Find the actual position in original
        idx = norm_haystack.find(norm_needle)
        # This is approximate - we need to map back to original positions
        # For now, try to find a similar line-based match
        pass

    # Try line-by-line fuzzy match
    needle_lines = [l.strip() for l in needle.strip().split('\n') if l.strip()]
    haystack_lines = haystack.split('\n')

    if not needle_lines:
        return None

    # Find start line
    first_line = needle_lines[0]
    for i, line in enumerate(haystack_lines):
        if first_line in line or line.strip() == first_line:
            # Check if subsequent lines match
            match_end = i + len(needle_lines)
            if match_end <= len(haystack_lines):
                matched_lines = haystack_lines[i:match_end]
                # Return the actual content from the file
                return '\n'.join(matched_lines)

    return None


def validate_changes(changes: list[CodeChange]) -> list[str]:
    """Validate proposed code changes. Returns list of errors."""
    errors = []

    if len(changes) > settings.feedback_max_files_per_pr:
        errors.append(
            f"Too many files: {len(changes)} (max {settings.feedback_max_files_per_pr})"
        )

    for change in changes:
        # Check path is allowed
        if not is_path_allowed(change.file_path):
            errors.append(f"File not allowed: {change.file_path}")
            continue

        # For modify actions, verify original_content exists in file
        if change.action == "modify":
            current_content = read_project_file(change.file_path)
            if current_content is None:
                errors.append(f"File not found: {change.file_path}")
            elif change.original_content:
                # Try to find a fuzzy match
                actual_match = find_best_match(change.original_content, current_content)
                if actual_match:
                    # Update the change with the actual matching content
                    change.original_content = actual_match
                else:
                    errors.append(
                        f"Original content not found in {change.file_path}. "
                        "The file may have changed or the match is inexact."
                    )

        # Basic syntax validation
        if change.file_path.endswith(".py"):
            try:
                compile(change.new_content, change.file_path, "exec")
            except SyntaxError as e:
                errors.append(f"Python syntax error in {change.file_path}: {e}")

        # For TypeScript/TSX, we do minimal validation
        # (full validation would require the TypeScript compiler)
        if change.file_path.endswith((".ts", ".tsx")):
            # Check for obvious issues
            if change.new_content.count("{") != change.new_content.count("}"):
                errors.append(f"Mismatched braces in {change.file_path}")

    return errors


async def generate_code_changes(
    feedback: Feedback,
    analysis: LLMAnalysis,
) -> tuple[list[CodeChange], str, str]:
    """Generate code changes for the feedback.

    Returns: (changes, pr_title, pr_description)
    """
    logger.info("Generating code for feedback: %s", feedback.id)

    # Gather context
    project_structure = get_project_structure()
    relevant_files = get_relevant_files(analysis.affected_areas, feedback.content)

    files_context = ""
    for path, content in relevant_files.items():
        files_context += f"\n### {path}\n```\n{content}\n```\n"

    user_message = f"""## User Feedback

{feedback.content}

## Analysis

Category: {analysis.category.value}
Summary: {analysis.summary}
Affected areas: {", ".join(analysis.affected_areas)}
Reasoning: {analysis.reasoning}

## Project Structure

```
{project_structure}
```

## Relevant Files
{files_context if files_context else "(No specific files identified)"}

Generate the code changes to address this feedback. Return a JSON object with changes, title, and description."""

    result = await chat_json(
        system=CODE_GENERATION_SYSTEM,
        user_message=user_message,
        max_tokens=4000,
        temperature=0.3,
    )

    changes = []
    for change_data in result.get("changes", []):
        changes.append(CodeChange(
            file_path=change_data.get("file_path", ""),
            action=change_data.get("action", "modify"),
            original_content=change_data.get("original_content"),
            new_content=change_data.get("new_content", ""),
            explanation=change_data.get("explanation", ""),
        ))

    pr_title = result.get("title", analysis.summary)[:60]
    pr_description = result.get("description", f"Addresses feedback: {analysis.summary}")

    # Validate changes
    errors = validate_changes(changes)
    if errors:
        logger.warning("Validation errors: %s", errors)
        # Filter out invalid changes
        valid_changes = []
        for change in changes:
            change_errors = [e for e in errors if change.file_path in e]
            if not change_errors:
                valid_changes.append(change)
        changes = valid_changes

    return changes, pr_title, pr_description
