"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useGenerationStore } from "@/lib/stores/generation-store";

export function StepTopic() {
  const { topic, setTopic, setStep } = useGenerationStore();
  const [localTopic, setLocalTopic] = useState(topic);

  const handleNext = () => {
    if (!localTopic.trim()) return;
    setTopic(localTopic.trim());
    setStep("style");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Describe your infographic</h2>
        <p className="text-sm text-muted">
          What topic, concept, or process should this infographic cover?
        </p>
      </div>

      <textarea
        value={localTopic}
        onChange={(e) => setLocalTopic(e.target.value)}
        placeholder="e.g., The photosynthesis process in plants, from sunlight absorption to glucose production..."
        className="w-full min-h-[120px] resize-y rounded-[var(--radius-lg)] border border-border bg-card p-4 text-sm placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-primary"
        autoFocus
      />

      <div className="flex justify-end">
        <Button onClick={handleNext} disabled={!localTopic.trim()}>
          Choose Style
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Button>
      </div>
    </div>
  );
}
