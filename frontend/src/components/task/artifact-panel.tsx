"use client";

import { useState, useEffect } from "react";
import { cn, downloadFile } from "@/lib/utils";
import { ProgressBar } from "@/components/ui/progress-bar";
import { useStyles } from "@/lib/hooks/use-references";
import { StepDataMap } from "@/types/generation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";

type TabId = "styles" | "image";

const TAB_LABELS: Record<TabId, string> = {
  styles: "Styles",
  image: "Image",
};

interface ArtifactPanelProps {
  status: string;
  progress: number;
  result: {
    image_url: string | null;
    layout_id: string | null;
    layout_name: string | null;
    style_id: string | null;
    style_name: string | null;
  } | null;
  stepData: StepDataMap;
  jobId: string;
  onStyleSelect?: (styleId: string) => void;
}

export function ArtifactPanel({ status, progress, result, stepData, jobId, onStyleSelect }: ArtifactPanelProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId | null>(null);
  const isCompleted = status === "completed";
  const isGenerating = status === "generating";
  const imageUrl = result?.image_url;

  const isAwaitingSelection = status === "awaiting_selection";

  // Compute available tabs
  const availableTabs: TabId[] = [];
  if (stepData.recommending) availableTabs.push("styles");
  if (imageUrl || isGenerating) availableTabs.push("image");

  // Auto-select latest tab as data arrives; force styles tab during selection
  useEffect(() => {
    if (isAwaitingSelection && availableTabs.includes("styles")) {
      setActiveTab("styles");
    } else if (availableTabs.length > 0) {
      setActiveTab(availableTabs[availableTabs.length - 1]);
    }
  }, [
    !!stepData.recommending,
    !!imageUrl,
    isGenerating,
    isAwaitingSelection,
  ]);

  const showTabs = availableTabs.length > 0;

  return (
    <aside className="hidden lg:flex flex-1 min-w-0 min-h-0 flex-col border-l border-border bg-card/50">
      {/* Header */}
      <div className="border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <h3 className="text-sm font-medium">
              {isCompleted ? "Result" : "Preview"}
            </h3>
            {isCompleted && result?.style_name && (
              <p className="text-xs text-muted">{result.style_name}</p>
            )}
          </div>

          {/* Action buttons */}
          {isCompleted && imageUrl && (
            <div className="flex items-center gap-1">
              <button
                onClick={() =>
                  downloadFile(imageUrl, `sumi-infographic-${Date.now()}.png`)
                }
                className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-md)] text-muted hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
                title="Download"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 2v8M7 10l-3-3M7 10l3-3M2 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                onClick={() => setFullscreen(true)}
                className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-md)] text-muted hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
                title="Fullscreen"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 5V2h3M9 2h3v3M12 9v3h-3M5 12H2V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Tab bar */}
        {showTabs && (
          <div className="flex gap-0 px-4 -mb-px">
            {availableTabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium border-b-2 transition-colors cursor-pointer",
                  activeTab === tab
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted hover:text-foreground"
                )}
              >
                {TAB_LABELS[tab]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 flex flex-col overflow-auto min-w-0 p-4">
        {!showTabs ? (
          /* Empty placeholder */
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-full max-w-xs aspect-video rounded-[var(--radius-lg)] border-2 border-dashed border-border/60 flex items-center justify-center">
                <div className="space-y-1.5">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="mx-auto text-muted/40">
                    <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
                    <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p className="text-xs text-muted/60">Your infographic will appear here</p>
                </div>
              </div>
              {progress > 0 && <ProgressBar value={progress} className="w-full max-w-xs" />}
            </div>
          </div>
        ) : activeTab === "styles" && stepData.recommending ? (
          <StyleGalleryTab
            recommendations={stepData.recommending.recommendations}
            selectedStyleId={stepData.selection?.style_id}
            onStyleSelect={onStyleSelect}
            isAwaitingSelection={isAwaitingSelection}
          />
        ) : activeTab === "image" ? (
          <ImageTab
            imageUrl={imageUrl}
            isGenerating={isGenerating}
            progress={progress}
            onFullscreen={() => setFullscreen(true)}
          />
        ) : null}
      </div>

      {/* Fullscreen lightbox */}
      {fullscreen && imageUrl && (
        <DialogPrimitive.Root open onOpenChange={(open) => !open && setFullscreen(false)}>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-black/95 data-[state=open]:animate-in data-[state=open]:fade-in" />
            <DialogPrimitive.Content
              className="fixed inset-0 z-[60] flex items-center justify-center p-4"
              aria-describedby={undefined}
            >
              <VisuallyHidden.Root>
                <DialogPrimitive.Title>Infographic Preview</DialogPrimitive.Title>
              </VisuallyHidden.Root>

              <DialogPrimitive.Close
                className="absolute top-4 right-4 z-10 text-white/70 hover:text-white transition-colors cursor-pointer"
                aria-label="Close"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </DialogPrimitive.Close>

              <img
                src={imageUrl}
                alt="Generated infographic"
                className="max-h-[90vh] max-w-[90vw] object-contain"
              />

              {/* Bottom bar */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-6 py-5 flex items-end justify-between gap-4">
                <div className="min-w-0 flex-1">
                  {result?.style_name && (
                    <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/20 text-white/90 backdrop-blur-sm mb-1.5">
                      {result.style_name}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    downloadFile(imageUrl, `sumi-infographic-${Date.now()}.png`)
                  }
                  className="shrink-0 px-4 py-2 rounded-full text-sm font-medium bg-white text-black hover:bg-white/90 transition-colors cursor-pointer"
                >
                  Download
                </button>
              </div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      )}
    </aside>
  );
}

/* ---------- Tab content components ---------- */

function StyleGalleryTab({
  recommendations,
  selectedStyleId,
  onStyleSelect,
  isAwaitingSelection,
}: {
  recommendations?: Array<{ style_id: string; style_name: string }>;
  selectedStyleId?: string;
  onStyleSelect?: (styleId: string) => void;
  isAwaitingSelection: boolean;
}) {
  const { data: allStyles } = useStyles();
  // Use the actual selected style if available, otherwise fall back to best_match recommendation
  const bestMatchStyleId = selectedStyleId ?? recommendations?.[0]?.style_id;

  if (!allStyles || allStyles.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-2">
      {allStyles.map((style) => {
        const isBestMatch = style.id === bestMatchStyleId;
        return (
          <button
            key={style.id}
            type="button"
            disabled={!isAwaitingSelection}
            onClick={() => isAwaitingSelection && onStyleSelect?.(style.id)}
            className={cn(
              "relative text-left rounded-[var(--radius-md)] border p-1.5 transition-all",
              isAwaitingSelection
                ? "cursor-pointer hover:border-primary/50 hover:shadow-sm"
                : "cursor-default",
              isBestMatch
                ? "border-primary ring-2 ring-primary/20"
                : "border-border"
            )}
          >
            {isBestMatch && (
              <span className="absolute -top-1.5 -right-1.5 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[8px] text-primary-foreground font-bold">
                ★
              </span>
            )}
            <img
              src={`/styles/${style.id}.jpg`}
              alt={style.name}
              className="w-full aspect-[4/3] rounded object-cover mb-1"
            />
            <p className="text-[10px] font-medium truncate leading-tight">
              {style.name}
            </p>
          </button>
        );
      })}
    </div>
  );
}

function ImageTab({
  imageUrl,
  isGenerating,
  progress,
  onFullscreen,
}: {
  imageUrl: string | null | undefined;
  isGenerating: boolean;
  progress: number;
  onFullscreen: () => void;
}) {
  if (imageUrl) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <img
          src={imageUrl}
          alt="Generated infographic"
          className="max-w-full max-h-full object-contain rounded-[var(--radius-md)] cursor-zoom-in"
          onClick={onFullscreen}
        />
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 w-full max-w-xs">
          <div className="w-full aspect-video rounded-[var(--radius-lg)] border-2 border-dashed border-border flex items-center justify-center">
            <div className="text-center space-y-2">
              <div className="h-8 w-8 mx-auto rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <p className="text-xs text-muted">Generating...</p>
            </div>
          </div>
          <ProgressBar value={progress} className="w-full" />
        </div>
      </div>
    );
  }

  return null;
}
