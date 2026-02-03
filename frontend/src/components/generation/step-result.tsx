"use client";

import { Button } from "@/components/ui/button";
import { useGenerationStore } from "@/lib/stores/generation-store";
import { useJobStatus } from "@/lib/hooks/use-generation";
import { ResultViewer } from "@/components/result/result-viewer";

export function StepResult() {
  const { jobId, reset, setStep, setSourceJobId } = useGenerationStore();
  const { data: job } = useJobStatus(jobId);

  const result = job?.result;

  if (!result) {
    return <div className="py-12 text-center text-sm text-muted">Loading result...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-1">Your infographic is ready</h2>
        <p className="text-sm text-muted">
          {result.layout_name && result.style_name
            ? `${result.layout_name} layout in ${result.style_name} style`
            : `Created in ${result.style_name || "artistic"} style`}
        </p>
      </div>

      <ResultViewer
        imageUrl={result.image_url}
        styleName={result.style_name}
      />

      <div className="flex justify-center gap-3">
        <Button variant="secondary" onClick={() => {
          if (jobId) setSourceJobId(jobId);
          setStep("style");
        }}>
          Try Different Style
        </Button>
        <Button variant="secondary" onClick={reset}>
          New Infographic
        </Button>
      </div>
    </div>
  );
}
