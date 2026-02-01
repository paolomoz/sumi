"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useGenerationStore } from "@/lib/stores/generation-store";
import { useRecommendations } from "@/lib/hooks/use-styles";
import { StyleRecommendationPanel } from "@/components/styles/style-recommendation";
import { StyleCatalog } from "@/components/styles/style-catalog";
import { Skeleton } from "@/components/ui/skeleton";
import { stylesCatalog } from "@/data/styles-catalog";

export function StepStyle() {
  const { topic, selectedStyleId, selectStyle, setStep, setRecommendations } =
    useGenerationStore();
  const [showFullCatalog, setShowFullCatalog] = useState(false);
  const { data, isLoading } = useRecommendations(topic, true);

  useEffect(() => {
    if (data?.recommendations) {
      setRecommendations(data.recommendations);
    }
  }, [data, setRecommendations]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Choose an artistic style</h2>
        <p className="text-sm text-muted">
          We recommend styles based on your topic, or browse all 126 styles.
        </p>
      </div>

      {/* Recommendations */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-4 w-48" />
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      ) : data?.recommendations ? (
        <StyleRecommendationPanel
          recommendations={data.recommendations}
          selectedId={selectedStyleId}
          onSelect={selectStyle}
        />
      ) : null}

      {/* Browse all */}
      <div>
        <button
          type="button"
          onClick={() => setShowFullCatalog(!showFullCatalog)}
          className="text-sm text-primary hover:underline cursor-pointer"
        >
          {showFullCatalog ? "Hide full catalog" : "Browse all 126 styles"}
        </button>

        {showFullCatalog && (
          <div className="mt-4">
            <StyleCatalog
              styles={stylesCatalog}
              selectedId={selectedStyleId}
              onSelect={selectStyle}
            />
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
