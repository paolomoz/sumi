"use client";

import { useCallback, useState } from "react";
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
  const [pendingStyleId, setPendingStyleId] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

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

  // Pre-select a style (visual only, no confirmation yet)
  const handleStylePreselect = useCallback((styleId: string) => {
    setPendingStyleId(styleId);
  }, []);

  // Actually confirm the pending style and continue the pipeline
  const handleConfirmStyle = useCallback(async () => {
    if (!pendingStyleId || isConfirming) return;
    setIsConfirming(true);
    try {
      await confirmSelection(jobId, {
        style_id: pendingStyleId,
        layout_id: "bento-grid",
      });
    } catch {
      // pipeline will wait indefinitely for selection
    } finally {
      setIsConfirming(false);
    }
  }, [jobId, pendingStyleId, isConfirming]);

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
        pendingStyleId={pendingStyleId}
        onPendingStyleSelect={handleStylePreselect}
        onConfirmStyle={handleConfirmStyle}
        isConfirming={isConfirming}
      />
      <ArtifactPanel
        status={status}
        progress={progress}
        result={result}
        stepData={stepData}
        jobId={jobId}
        pendingStyleId={pendingStyleId}
        onStylePreselect={handleStylePreselect}
      />
    </div>
  );
}
