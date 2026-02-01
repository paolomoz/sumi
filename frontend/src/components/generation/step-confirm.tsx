"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useGenerationStore } from "@/lib/stores/generation-store";
import { useStartGeneration } from "@/lib/hooks/use-generation";
import { stylesCatalog } from "@/data/styles-catalog";

export function StepConfirm() {
  const { topic, selectedStyleId, aspectRatio, outputMode, setOutputMode, setStep, setJobId } = useGenerationStore();
  const mutation = useStartGeneration();

  const style = stylesCatalog.find((s) => s.id === selectedStyleId);

  const handleGenerate = async () => {
    try {
      const result = await mutation.mutateAsync({
        topic,
        style_id: selectedStyleId || undefined,
        aspect_ratio: aspectRatio,
        output_mode: outputMode,
      });
      setJobId(result.job_id);
      setStep("progress");
    } catch {
      // Error is handled by mutation state
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Review & generate</h2>
        <p className="text-sm text-muted">
          Confirm your choices before generating the infographic.
        </p>
      </div>

      <div className="space-y-3">
        <Card>
          <div className="text-xs font-medium text-muted uppercase tracking-wider mb-1">Topic</div>
          <p className="text-sm">{topic}</p>
        </Card>

        <Card>
          <div className="text-xs font-medium text-muted uppercase tracking-wider mb-2">Output Mode</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setOutputMode("visual")}
              className={`rounded-[var(--radius-md)] border p-3 text-left transition-all ${
                outputMode === "visual"
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-border hover:border-muted-foreground/30"
              }`}
            >
              <p className="text-sm font-medium">Mostly Visual</p>
              <p className="text-xs text-muted mt-0.5">Rich artwork with minimal text labels</p>
            </button>
            <button
              type="button"
              onClick={() => setOutputMode("textual")}
              className={`rounded-[var(--radius-md)] border p-3 text-left transition-all ${
                outputMode === "textual"
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-border hover:border-muted-foreground/30"
              }`}
            >
              <p className="text-sm font-medium">Mostly Text</p>
              <p className="text-xs text-muted mt-0.5">Detailed text with supporting artwork</p>
            </button>
          </div>
        </Card>

        <Card>
          <div className="text-xs font-medium text-muted uppercase tracking-wider mb-1">Style</div>
          <div className="flex items-center gap-3">
            {style && (
              <>
                <div className="flex h-10 w-10 shrink-0 overflow-hidden rounded-[var(--radius-md)]">
                  {style.color_palette.slice(0, 4).map((c, i) => (
                    <div key={i} className="flex-1 h-full" style={{ backgroundColor: c }} />
                  ))}
                </div>
                <div>
                  <p className="text-sm font-medium">{style.name}</p>
                  <p className="text-xs text-muted">{style.category}</p>
                </div>
              </>
            )}
          </div>
        </Card>

        <Card>
          <div className="text-xs font-medium text-muted uppercase tracking-wider mb-1">
            Aspect Ratio
          </div>
          <p className="text-sm">{aspectRatio}</p>
        </Card>
      </div>

      {mutation.error && (
        <div className="rounded-[var(--radius-md)] bg-red-50 p-3 text-sm text-destructive">
          {mutation.error.message}
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="ghost" onClick={() => setStep("style")}>
          Back
        </Button>
        <Button onClick={handleGenerate} disabled={mutation.isPending}>
          {mutation.isPending ? "Starting..." : "Generate Infographic"}
        </Button>
      </div>
    </div>
  );
}
