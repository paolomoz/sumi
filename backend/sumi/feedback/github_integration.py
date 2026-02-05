"""GitHub integration for creating PRs from feedback."""

import base64
import logging
import re
from pathlib import Path

import httpx

from sumi.config import settings
from sumi.feedback.models import CodeChange

logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent

GITHUB_API_BASE = "https://api.github.com"


class GitHubClient:
    """Client for GitHub API operations."""

    def __init__(self):
        self.token = settings.github_token
        self.owner = settings.github_repo_owner
        self.repo = settings.github_repo_name
        self.base_branch = settings.github_base_branch

    @property
    def is_configured(self) -> bool:
        """Check if GitHub integration is properly configured."""
        return bool(self.token and self.owner and self.repo)

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }

    async def _request(
        self,
        method: str,
        path: str,
        **kwargs,
    ) -> dict | list | None:
        """Make a request to the GitHub API."""
        url = f"{GITHUB_API_BASE}{path}"
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.request(
                method,
                url,
                headers=self._headers(),
                **kwargs,
            )
            if response.status_code == 404:
                return None
            response.raise_for_status()
            if response.status_code == 204:
                return {}
            return response.json()

    async def get_default_branch_sha(self) -> str:
        """Get the SHA of the default branch."""
        result = await self._request(
            "GET",
            f"/repos/{self.owner}/{self.repo}/git/ref/heads/{self.base_branch}",
        )
        return result["object"]["sha"]

    async def create_branch(self, branch_name: str, from_sha: str) -> bool:
        """Create a new branch from the given SHA."""
        try:
            await self._request(
                "POST",
                f"/repos/{self.owner}/{self.repo}/git/refs",
                json={
                    "ref": f"refs/heads/{branch_name}",
                    "sha": from_sha,
                },
            )
            return True
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 422:
                # Branch already exists
                logger.warning("Branch %s already exists", branch_name)
                return True
            raise

    async def get_file_content(self, path: str, branch: str) -> tuple[str, str] | None:
        """Get file content and SHA from GitHub."""
        result = await self._request(
            "GET",
            f"/repos/{self.owner}/{self.repo}/contents/{path}",
            params={"ref": branch},
        )
        if result is None:
            return None
        content = base64.b64decode(result["content"]).decode("utf-8")
        return content, result["sha"]

    async def create_or_update_file(
        self,
        path: str,
        content: str,
        message: str,
        branch: str,
        file_sha: str | None = None,
    ) -> str:
        """Create or update a file. Returns the commit SHA."""
        payload = {
            "message": message,
            "content": base64.b64encode(content.encode()).decode(),
            "branch": branch,
        }
        if file_sha:
            payload["sha"] = file_sha

        result = await self._request(
            "PUT",
            f"/repos/{self.owner}/{self.repo}/contents/{path}",
            json=payload,
        )
        return result["commit"]["sha"]

    async def create_pull_request(
        self,
        title: str,
        body: str,
        head_branch: str,
        base_branch: str | None = None,
        labels: list[str] | None = None,
    ) -> dict:
        """Create a pull request."""
        result = await self._request(
            "POST",
            f"/repos/{self.owner}/{self.repo}/pulls",
            json={
                "title": title,
                "body": body,
                "head": head_branch,
                "base": base_branch or self.base_branch,
            },
        )

        # Add labels if specified
        if labels and result.get("number"):
            await self._request(
                "POST",
                f"/repos/{self.owner}/{self.repo}/issues/{result['number']}/labels",
                json={"labels": labels},
            )

        return result


def sanitize_branch_name(text: str) -> str:
    """Convert text to a valid git branch name."""
    # Remove special characters, keep alphanumeric and spaces
    clean = re.sub(r"[^a-zA-Z0-9\s-]", "", text)
    # Replace spaces with hyphens
    clean = re.sub(r"\s+", "-", clean)
    # Remove consecutive hyphens
    clean = re.sub(r"-+", "-", clean)
    # Lowercase and trim
    clean = clean.lower().strip("-")
    # Limit length
    return clean[:40]


async def create_pr_from_changes(
    feedback_id: str,
    changes: list[CodeChange],
    title: str,
    description: str,
) -> tuple[str, str]:
    """Create a GitHub PR from the code changes.

    Returns: (pr_url, branch_name)
    """
    client = GitHubClient()

    if not client.is_configured:
        raise ValueError("GitHub integration not configured")

    # Create branch name
    summary_slug = sanitize_branch_name(title)
    branch_name = f"feedback/{feedback_id}-{summary_slug}"

    logger.info("Creating PR branch: %s", branch_name)

    # Get base branch SHA
    base_sha = await client.get_default_branch_sha()

    # Create the branch
    await client.create_branch(branch_name, base_sha)

    # Apply each change
    for change in changes:
        logger.info("Applying change to %s (%s)", change.file_path, change.action)

        if change.action == "create":
            # Create new file
            await client.create_or_update_file(
                path=change.file_path,
                content=change.new_content,
                message=f"Add {change.file_path}\n\n{change.explanation}",
                branch=branch_name,
            )

        elif change.action == "modify":
            # Get current file content and SHA
            result = await client.get_file_content(change.file_path, branch_name)
            if result is None:
                logger.error("File not found for modify: %s", change.file_path)
                continue

            current_content, file_sha = result

            # Apply the modification
            if change.original_content and change.original_content in current_content:
                new_content = current_content.replace(
                    change.original_content,
                    change.new_content,
                    1,  # Only replace first occurrence
                )
            else:
                # If original content not found, skip this change
                logger.warning(
                    "Original content not found in %s, skipping",
                    change.file_path,
                )
                continue

            await client.create_or_update_file(
                path=change.file_path,
                content=new_content,
                message=f"Update {change.file_path}\n\n{change.explanation}",
                branch=branch_name,
                file_sha=file_sha,
            )

    # Create the PR
    pr_body = f"""{description}

---

**Feedback ID:** `{feedback_id}`

**Changes:**
{chr(10).join(f"- `{c.file_path}`: {c.explanation}" for c in changes)}

---

> This PR was automatically generated from user feedback.
> Please review all changes carefully before merging.
"""

    pr = await client.create_pull_request(
        title=title,
        body=pr_body,
        head_branch=branch_name,
        labels=["feedback", "ai-generated"],
    )

    pr_url = pr.get("html_url", "")
    logger.info("Created PR: %s", pr_url)

    return pr_url, branch_name
