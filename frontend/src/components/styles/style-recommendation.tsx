"use client";

import { CombinationRecommendation } from "@/types/style";
import { cn } from "@/lib/utils";

interface StyleRecommendationProps {
  recommendations: CombinationRecommendation[];
  selectedId?: string | null;
  onSelect: (styleId: string, layoutId?: string) => void;
}

const approachLabels = {
  best_match: { label: "Best Match", desc: "Most appropriate combination", color: "#16A34A" },
  creative: { label: "Creative", desc: "Unexpected, visually striking", color: "#9333EA" },
  accessible: { label: "Accessible", desc: "Broadest appeal", color: "#2563EB" },
};

export function StyleRecommendationPanel({
  recommendations,
  selectedId,
  onSelect,
}: StyleRecommendationProps) {
  if (recommendations.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-primary">
          <path d="M8 1l2 4 4 1-3 3 1 4-4-2-4 2 1-4-3-3 4-1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
        <h3 className="text-sm font-medium">Recommended combinations</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {recommendations.map((rec) => {
          const approach = approachLabels[rec.approach] || approachLabels.accessible;
          return (
            <button
              key={`${rec.layout_id}-${rec.style_id}`}
              type="button"
              onClick={() => onSelect(rec.style_id, rec.layout_id)}
              className={cn(
                "text-left rounded-[var(--radius-lg)] border p-4 transition-all cursor-pointer",
                "hover:shadow-md",
                selectedId === rec.style_id
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-border hover:border-primary/30"
              )}
            >
              {/* Approach badge */}
              <div
                className="inline-flex items-center gap-1 rounded-[var(--radius-full)] px-2 py-0.5 text-xs font-medium mb-2"
                style={{ backgroundColor: `${approach.color}18`, color: approach.color }}
              >
                {approach.label}
              </div>

              <h4 className="font-medium text-sm mb-0.5">{rec.style_name}</h4>
              <p className="text-xs text-muted mb-1">{rec.layout_name} layout</p>
              <p className="text-xs text-muted line-clamp-2">{rec.rationale}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
