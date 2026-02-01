import asyncio
import json
import uuid
from collections import defaultdict

from sumi.jobs.models import Job, JobStatus, STEP_PROGRESS, STEP_MESSAGES


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
        aspect_ratio: str = "9:16",
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
        event = {
            "status": status.value,
            "progress": STEP_PROGRESS.get(status, 0),
            "message": STEP_MESSAGES.get(status, ""),
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
                yield {
                    "event": "status",
                    "data": json.dumps({
                        "status": job.status.value,
                        "progress": STEP_PROGRESS.get(job.status, 0),
                        "message": STEP_MESSAGES.get(job.status, ""),
                    }),
                }

            while True:
                event = await asyncio.wait_for(queue.get(), timeout=60)
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
