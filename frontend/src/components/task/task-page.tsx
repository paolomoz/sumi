"use client";

import { useCallback } from "react";
import { useJobStatus } from "@/lib/hooks/use-generation";
import { useTaskSSE } from "@/lib/hooks/use-task-sse";
import { confirmSelection } from "@/lib/api/client";
import { ChatColumn } from "./chat-column";
import { ArtifactPanel } from "./artifact-panel";

interface TaskPageProps {
  jobId: string;
}

export function TaskPage({ jobId }: TaskPageProps) {
  const { data: restData } = useJobStatus(jobId);
  const sse = useTaskSSE(jobId);

  // Merge REST + SSE: SSE takes precedence when connected
  const status = sse.status || restData?.status || "queued";
  const progress = sse.progress || restData?.progress?.progress || 0;
  const message = sse.message || restData?.progress?.message || "";
  const error = restData?.error || null;
  const topic = restData?.topic || "";

  // Merge step data: SSE overrides REST
  const stepData = {
    ...(restData?.step_data || {}),
    ...sse.stepData,
  };

  // Result from SSE or REST
  const result = sse.result || (restData?.result
    ? {
        image_url: restData.result.image_url,
        layout_id: restData.result.layout_id,
        layout_name: restData.result.layout_name,
        style_id: restData.result.style_id,
        style_name: restData.result.style_name,
        mode: restData.result.mode,
      }
    : null);

  const handleStyleSelect = useCallback(
    async (styleId: string, layoutId?: string) => {
      try {
        await confirmSelection(jobId, {
          style_id: styleId,
          layout_id: layoutId || "bento-grid",
        });
      } catch {
        // pipeline will wait indefinitely for selection
      }
    },
    [jobId]
  );

  return (
    <div className="flex h-full min-w-0">
      <ChatColumn
        jobId={jobId}
        topic={topic}
        status={status}
        progress={progress}
        message={message}
        stepData={stepData}
        result={result}
        error={error}
      />
      <ArtifactPanel
        status={status}
        progress={progress}
        result={result}
        stepData={stepData}
        jobId={jobId}
        onStyleSelect={handleStyleSelect}
      />
    </div>
  );
}
