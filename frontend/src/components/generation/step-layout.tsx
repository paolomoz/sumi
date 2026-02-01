"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGenerationStore } from "@/lib/stores/generation-store";
import { useLayouts } from "@/lib/hooks/use-references";
import { cn } from "@/lib/utils";

export function StepLayout() {
  const { selectedLayoutId, selectLayout, setStep } = useGenerationStore();
  const { data: layouts, isLoading } = useLayouts();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Choose a layout</h2>
        <p className="text-sm text-muted">
          Select how your infographic should be structured.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto pr-1">
          {layouts?.map((layout) => (
            <button
              key={layout.id}
              type="button"
              onClick={() => selectLayout(layout.id)}
              className={cn(
                "text-left rounded-[var(--radius-lg)] border p-3 transition-all cursor-pointer",
                "hover:shadow-md",
                selectedLayoutId === layout.id
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-border hover:border-primary/30"
              )}
            >
              <h4 className="font-medium text-xs mb-1 truncate">{layout.name}</h4>
              <p className="text-xs text-muted line-clamp-2">
                {layout.best_for.slice(0, 2).join(", ")}
              </p>
            </button>
          ))}
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="ghost" onClick={() => setStep("topic")}>
          Back
        </Button>
        <Button onClick={() => setStep("style")} disabled={!selectedLayoutId}>
          Choose Style
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Button>
      </div>
    </div>
  );
}
