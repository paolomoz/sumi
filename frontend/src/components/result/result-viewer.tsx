"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { downloadFile } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ResultViewerProps {
  imageUrl: string | null;
  styleName?: string | null;
}

export function ResultViewer({ imageUrl, styleName }: ResultViewerProps) {
  const [zoomed, setZoomed] = useState(false);

  if (!imageUrl) {
    return (
      <div className="aspect-[9/16] max-w-sm mx-auto rounded-[var(--radius-lg)] bg-accent flex items-center justify-center text-sm text-muted">
        No image available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Image */}
      <div
        className={cn(
          "relative mx-auto overflow-hidden rounded-[var(--radius-lg)] border border-border bg-accent cursor-zoom-in transition-all",
          zoomed ? "max-w-full" : "max-w-sm"
        )}
        onClick={() => setZoomed(!zoomed)}
      >
        <img
          src={imageUrl}
          alt={`Infographic in ${styleName || "artistic"} style`}
          className="w-full h-auto"
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            downloadFile(
              imageUrl,
              `sumi-infographic-${Date.now()}.png`
            )
          }
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 2v8M7 10l-3-3M7 10l3-3M2 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Download PNG
        </Button>
      </div>
    </div>
  );
}
