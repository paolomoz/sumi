import asyncio
import json
import uuid
from collections import defaultdict

from sumi.jobs.models import (
    Job, JobStatus,
    STEP_PROGRESS, STEP_MESSAGES,
    RESTYLE_STEP_PROGRESS, RESTYLE_STEP_MESSAGES,
)


class JobManager:
    def __init__(self):
        self._jobs: dict[str, Job] = {}
        self._listeners: dict[str, list[asyncio.Queue]] = defaultdict(list)

    def create_job(
        self,
        topic: str,
        style_id: str | None = None,
        layout_id: str | None = None,
        text_labels: list[str] | None = None,
        aspect_ratio: str = "16:9",
        language: str = "English",
    ) -> Job:
        job_id = uuid.uuid4().hex[:12]
        job = Job(
            id=job_id,
            topic=topic,
            style_id=style_id,
            layout_id=layout_id,
            text_labels=text_labels,
            aspect_ratio=aspect_ratio,
            language=language,
        )
        self._jobs[job_id] = job
        return job

    def create_restyle_job(
        self,
        source_job: Job,
        style_id: str,
        layout_id: str | None = None,
        aspect_ratio: str = "16:9",
        language: str = "English",
    ) -> Job:
        job_id = uuid.uuid4().hex[:12]
        job = Job(
            id=job_id,
            topic=source_job.topic,
            style_id=style_id,
            layout_id=layout_id or source_job.layout_id,
            text_labels=source_job.text_labels,
            aspect_ratio=aspect_ratio,
            language=language,
            source_job_id=source_job.id,
            # Pre-populate from source job
            analysis=source_job.analysis,
            structured_content=source_job.structured_content,
            recommendations=source_job.recommendations,
        )
        self._jobs[job_id] = job
        return job

    def get_job(self, job_id: str) -> Job | None:
        return self._jobs.get(job_id)

    async def update_status(self, job_id: str, status: JobStatus, error: str | None = None):
        job = self._jobs.get(job_id)
        if not job:
            return
        job.status = status
        if error:
            job.error = error
        await self._notify(job_id, status)

    async def _notify(self, job_id: str, status: JobStatus):
        job = self._jobs.get(job_id)
        is_restyle = job and job.source_job_id is not None
        progress_map = RESTYLE_STEP_PROGRESS if is_restyle else STEP_PROGRESS
        message_map = RESTYLE_STEP_MESSAGES if is_restyle else STEP_MESSAGES
        event = {
            "status": status.value,
            "progress": progress_map.get(status, 0),
            "message": message_map.get(status, ""),
        }
        for queue in self._listeners.get(job_id, []):
            await queue.put(event)

    def subscribe(self, job_id: str) -> asyncio.Queue:
        queue: asyncio.Queue = asyncio.Queue()
        self._listeners[job_id].append(queue)
        return queue

    def unsubscribe(self, job_id: str, queue: asyncio.Queue):
        listeners = self._listeners.get(job_id, [])
        if queue in listeners:
            listeners.remove(queue)

    async def sse_generator(self, job_id: str):
        """Async generator yielding SSE events for a job."""
        queue = self.subscribe(job_id)
        try:
            # Send current status immediately
            job = self.get_job(job_id)
            if job:
                is_restyle = job.source_job_id is not None
                progress_map = RESTYLE_STEP_PROGRESS if is_restyle else STEP_PROGRESS
                message_map = RESTYLE_STEP_MESSAGES if is_restyle else STEP_MESSAGES
                yield {
                    "event": "status",
                    "data": json.dumps({
                        "status": job.status.value,
                        "progress": progress_map.get(job.status, 0),
                        "message": message_map.get(job.status, ""),
                    }),
                }

            while True:
                event = await asyncio.wait_for(queue.get(), timeout=600)
                data = {
                    "event": "status",
                    "data": json.dumps(event),
                }
                yield data
                if event["status"] in (JobStatus.COMPLETED.value, JobStatus.FAILED.value):
                    # Send final result for completed jobs
                    if event["status"] == JobStatus.COMPLETED.value and job:
                        yield {
                            "event": "result",
                            "data": json.dumps({
                                "image_url": job.image_url,
                                "layout_id": job.layout_id,
                                "layout_name": job.layout_name,
                                "style_id": job.style_id,
                                "style_name": job.style_name,
                            }),
                        }
                    break
        except asyncio.TimeoutError:
            yield {"event": "timeout", "data": "{}"}
        finally:
            self.unsubscribe(job_id, queue)


# Singleton
job_manager = JobManager()
