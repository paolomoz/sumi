"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGenerationStore } from "@/lib/stores/generation-store";
import { useStyles, useRecommendations } from "@/lib/hooks/use-references";
import { StyleRecommendationPanel } from "@/components/styles/style-recommendation";
import { cn } from "@/lib/utils";

export function StepStyle() {
  const {
    topic,
    selectedStyleId,
    selectStyle,
    selectCombination,
    setStep,
    setRecommendations,
  } = useGenerationStore();
  const { data: styles, isLoading: stylesLoading } = useStyles();
  const { data: recData, isLoading: recsLoading } = useRecommendations(topic, true);

  useEffect(() => {
    if (recData?.recommendations) {
      setRecommendations(recData.recommendations);
    }
  }, [recData, setRecommendations]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Choose an artistic style</h2>
        <p className="text-sm text-muted">
          We recommend styles based on your topic, or browse all 19 styles.
        </p>
      </div>

      {/* Recommendations */}
      {recsLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-4 w-48" />
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      ) : recData?.recommendations ? (
        <StyleRecommendationPanel
          recommendations={recData.recommendations}
          selectedId={selectedStyleId}
          onSelect={(styleId, layoutId) => {
            if (layoutId) {
              selectCombination(layoutId, styleId);
            } else {
              selectStyle(styleId);
            }
          }}
        />
      ) : null}

      {/* Browse all styles */}
      <div>
        <h3 className="text-sm font-medium mb-3">All styles</h3>
        {stylesLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-1">
            {styles?.map((style) => (
              <button
                key={style.id}
                type="button"
                onClick={() => selectStyle(style.id)}
                className={cn(
                  "text-left rounded-[var(--radius-lg)] border overflow-hidden transition-all cursor-pointer",
                  "hover:shadow-md",
                  selectedStyleId === style.id
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-border hover:border-primary/30"
                )}
              >
                <img
                  src={`/styles/${style.id}.jpg`}
                  alt=""
                  className="w-full h-24 object-cover"
                  draggable={false}
                />
                <div className="p-3 pt-2">
                  <h4 className="font-medium text-sm mb-1">{style.name}</h4>
                  <p className="text-xs text-muted line-clamp-2">{style.best_for}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="ghost" onClick={() => setStep("topic")}>
          Back
        </Button>
        <Button onClick={() => setStep("confirm")} disabled={!selectedStyleId}>
          Review & Generate
        </Button>
      </div>
    </div>
  );
}
