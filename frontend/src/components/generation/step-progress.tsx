"use client";

import { useGenerationStore } from "@/lib/stores/generation-store";
import { useJobStatus } from "@/lib/hooks/use-generation";
import { ProgressBar } from "@/components/ui/progress-bar";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

const fullPipelineSteps = [
  { key: "analyzing", label: "Analyzing Content", icon: "magnify" },
  { key: "structuring", label: "Structuring Content", icon: "layers" },
  { key: "recommending", label: "Finding Best Combinations", icon: "palette" },
  { key: "crafting", label: "Crafting Prompt", icon: "pen" },
  { key: "generating", label: "Generating Infographic", icon: "image" },
];

const restylePipelineSteps = [
  { key: "crafting", label: "Crafting Prompt", icon: "pen" },
  { key: "generating", label: "Generating Infographic", icon: "image" },
];

export function StepProgress() {
  const { jobId, sourceJobId, setStep } = useGenerationStore();
  const { data: job } = useJobStatus(jobId);

  useEffect(() => {
    if (job?.status === "completed") {
      setStep("result");
    }
  }, [job?.status, setStep]);

  const isRestyle = !!sourceJobId;
  const pipelineSteps = isRestyle ? restylePipelineSteps : fullPipelineSteps;

  const progress = job?.progress?.progress ?? 0;
  const currentStep = job?.status ?? "queued";
  const message = job?.progress?.message ?? "Starting...";

  return (
    <div className="space-y-8 py-8">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">
          {isRestyle ? "Restyling your infographic" : "Creating your infographic"}
        </h2>
        <p className="text-sm text-muted">{message}</p>
      </div>

      <ProgressBar value={progress} className="max-w-md mx-auto" />

      {/* Pipeline steps */}
      <div className="max-w-md mx-auto space-y-2">
        {pipelineSteps.map((step) => {
          const stepIndex = pipelineSteps.findIndex((s) => s.key === step.key);
          const currentIndex = pipelineSteps.findIndex((s) => s.key === currentStep);
          const isDone = stepIndex < currentIndex;
          const isActive = step.key === currentStep;
          const isPending = stepIndex > currentIndex;

          return (
            <div
              key={step.key}
              className={cn(
                "flex items-center gap-3 rounded-[var(--radius-md)] px-4 py-2.5 text-sm transition-colors",
                isActive && "bg-primary-light text-primary font-medium",
                isDone && "text-muted",
                isPending && "text-muted-foreground/50"
              )}
            >
              {/* Status icon */}
              <div className="flex h-5 w-5 items-center justify-center">
                {isDone ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : isActive ? (
                  <div className="h-3 w-3 rounded-full bg-primary animate-pulse" />
                ) : (
                  <div className="h-2 w-2 rounded-full bg-current opacity-30" />
                )}
              </div>
              {step.label}
            </div>
          );
        })}
      </div>

      {/* Error state */}
      {job?.status === "failed" && (
        <div className="max-w-md mx-auto rounded-[var(--radius-md)] bg-red-50 p-4 text-sm text-destructive">
          <p className="font-medium mb-1">Generation failed</p>
          <p>{job.error}</p>
        </div>
      )}
    </div>
  );
}
