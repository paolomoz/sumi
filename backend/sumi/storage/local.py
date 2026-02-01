from pathlib import Path

from sumi.config import settings


def get_output_dir() -> Path:
    path = Path(settings.output_dir)
    path.mkdir(parents=True, exist_ok=True)
    return path


def get_job_output_dir(job_id: str) -> Path:
    path = get_output_dir() / job_id
    path.mkdir(parents=True, exist_ok=True)
    return path
