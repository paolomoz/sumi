import asyncio
import json
import logging
import uuid
from collections import defaultdict

from sumi.jobs.models import (
    Job, JobStatus,
    STEP_PROGRESS, STEP_MESSAGES,
    RESTYLE_STEP_PROGRESS, RESTYLE_STEP_MESSAGES,
)

logger = logging.getLogger(__name__)


class JobManager:
    def __init__(self):
        self._jobs: dict[str, Job] = {}
        self._listeners: dict[str, list[asyncio.Queue]] = defaultdict(list)
        self._step_data: dict[str, dict[str, dict]] = defaultdict(dict)

    def create_job(
        self,
        topic: str,
        style_id: str | None = None,
        layout_id: str | None = None,
        text_labels: list[str] | None = None,
        aspect_ratio: str = "16:9",
        language: str = "English",
        user_id: str | None = None,
    ) -> Job:
        job_id = uuid.uuid4().hex[:12]
        job = Job(
            id=job_id,
            topic=topic,
            user_id=user_id,
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
            user_id=source_job.user_id,
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

    def get_step_data(self, job_id: str) -> dict[str, dict]:
        return dict(self._step_data.get(job_id, {}))

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
            "type": "status",
            "status": status.value,
            "progress": progress_map.get(status, 0),
            "message": message_map.get(status, ""),
        }
        for queue in self._listeners.get(job_id, []):
            await queue.put(event)

    async def send_step_data(self, job_id: str, step: str, data: dict):
        """Emit step_data event and accumulate for reconnection replay."""
        self._step_data[job_id][step] = data
        event = {
            "type": "step_data",
            "step": step,
            "data": data,
        }
        for queue in self._listeners.get(job_id, []):
            await queue.put(event)

    async def confirm_selection(self, job_id: str, layout_id: str, style_id: str) -> bool:
        """Confirm style/layout selection for a paused job."""
        job = self._jobs.get(job_id)
        if not job or job.status != JobStatus.AWAITING_SELECTION:
            return False
        job.confirmed_layout_id = layout_id
        job.confirmed_style_id = style_id
        if job.selection_event:
            job.selection_event.set()
        return True

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
                        "type": "status",
                        "status": job.status.value,
                        "progress": progress_map.get(job.status, 0),
                        "message": message_map.get(job.status, ""),
                    }),
                }

                # Replay accumulated step data for reconnection resilience
                for step, data in self._step_data.get(job_id, {}).items():
                    yield {
                        "event": "step_data",
                        "data": json.dumps({
                            "type": "step_data",
                            "step": step,
                            "data": data,
                        }),
                    }

            while True:
                event = await asyncio.wait_for(queue.get(), timeout=600)
                event_type = event.get("type", "status")
                data = {
                    "event": event_type,
                    "data": json.dumps(event),
                }
                yield data
                if event.get("status") in (JobStatus.COMPLETED.value, JobStatus.FAILED.value):
                    # Send final result for completed jobs
                    if event.get("status") == JobStatus.COMPLETED.value and job:
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
