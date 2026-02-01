"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useGenerationStore } from "@/lib/stores/generation-store";
import { useStartGeneration } from "@/lib/hooks/use-generation";

const LANGUAGES = ["English", "Spanish", "French", "German", "Italian", "Portuguese", "Japanese", "Chinese", "Korean"];

export function StepConfirm() {
  const {
    topic,
    selectedStyleId,
    selectedLayoutId,
    aspectRatio,
    language,
    setLanguage,
    setStep,
    setJobId,
  } = useGenerationStore();
  const mutation = useStartGeneration();

  const handleGenerate = async () => {
    try {
      const result = await mutation.mutateAsync({
        topic,
        style_id: selectedStyleId || undefined,
        layout_id: selectedLayoutId || undefined,
        aspect_ratio: aspectRatio,
        language,
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
          <div className="text-xs font-medium text-muted uppercase tracking-wider mb-1">Layout</div>
          <p className="text-sm">{selectedLayoutId || "Auto-selected"}</p>
        </Card>

        <Card>
          <div className="text-xs font-medium text-muted uppercase tracking-wider mb-1">Style</div>
          <p className="text-sm">{selectedStyleId || "Auto-selected"}</p>
        </Card>

        <Card>
          <div className="text-xs font-medium text-muted uppercase tracking-wider mb-2">Language</div>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setLanguage(lang)}
                className={`rounded-[var(--radius-full)] px-3 py-1 text-xs font-medium transition-all ${
                  language === lang
                    ? "bg-foreground text-background"
                    : "bg-accent text-muted hover:text-foreground"
                }`}
              >
                {lang}
              </button>
            ))}
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
