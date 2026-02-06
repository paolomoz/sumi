"use client";

import { useState, useEffect, useCallback } from "react";
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

const ZOOM_LEVELS = [25, 50, 75, 100, 150, 200];

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
  const [previewZoom, setPreviewZoom] = useState<number | null>(null); // null = fit
  const [fullscreenZoom, setFullscreenZoom] = useState<number | null>(null); // null = fit
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

  const handleDownload = useCallback(() => {
    if (imageUrl) {
      downloadFile(imageUrl, `sumi-infographic-${Date.now()}.png`);
    }
  }, [imageUrl]);

  return (
    <aside className="hidden lg:flex flex-1 min-w-0 min-h-0 flex-col border-l border-border bg-card/50">
      {/* Header */}
      <div className="border-b border-border">
        <div className="flex items-center justify-between px-4 py-4">
          <div>
            <h3 className="text-sm font-medium">
              {isCompleted ? "Result" : "Preview"}
            </h3>
            {isCompleted && result?.style_name && (
              <p className="text-xs text-muted">{result.style_name}</p>
            )}
          </div>
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
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {!showTabs ? (
          /* Empty placeholder */
          <div className="flex-1 flex items-center justify-center p-4">
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
          <div className="flex-1 overflow-auto p-4">
            <StyleGalleryTab
              recommendations={stepData.recommending.recommendations}
              selectedStyleId={stepData.selection?.style_id}
              onStyleSelect={onStyleSelect}
              isAwaitingSelection={isAwaitingSelection}
            />
          </div>
        ) : activeTab === "image" ? (
          <ImageTab
            imageUrl={imageUrl}
            isGenerating={isGenerating}
            progress={progress}
            zoom={previewZoom}
            onZoomChange={setPreviewZoom}
            onFullscreen={() => {
              setFullscreenZoom(previewZoom);
              setFullscreen(true);
            }}
            onDownload={handleDownload}
            isCompleted={isCompleted}
          />
        ) : null}
      </div>

      {/* Fullscreen lightbox */}
      {fullscreen && imageUrl && (
        <FullscreenViewer
          imageUrl={imageUrl}
          styleName={result?.style_name}
          zoom={fullscreenZoom}
          onZoomChange={setFullscreenZoom}
          onClose={() => setFullscreen(false)}
          onDownload={handleDownload}
        />
      )}
    </aside>
  );
}

/* ---------- Zoom toolbar ---------- */

function ZoomToolbar({
  zoom,
  onZoomChange,
  onDownload,
  onExpand,
  onClose,
  variant = "light",
}: {
  zoom: number | null;
  onZoomChange: (z: number | null) => void;
  onDownload: () => void;
  onExpand?: () => void;
  onClose?: () => void;
  variant?: "light" | "dark";
}) {
  const displayZoom = zoom ?? null;

  const zoomIn = () => {
    const current = zoom ?? 50;
    const next = ZOOM_LEVELS.find((z) => z > current);
    onZoomChange(next ?? ZOOM_LEVELS[ZOOM_LEVELS.length - 1]);
  };

  const zoomOut = () => {
    const current = zoom ?? 50;
    const prev = [...ZOOM_LEVELS].reverse().find((z) => z < current);
    onZoomChange(prev ?? ZOOM_LEVELS[0]);
  };

  const resetZoom = () => {
    onZoomChange(null);
  };

  const isDark = variant === "dark";
  const btnBase = isDark
    ? "flex h-8 w-8 items-center justify-center rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
    : "flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer";
  const separatorClass = isDark ? "w-px h-4 bg-white/20" : "w-px h-4 bg-border";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg px-1 py-1",
        isDark
          ? "bg-white/10 backdrop-blur-md border border-white/10"
          : ""
      )}
    >
      {/* Download */}
      <button onClick={onDownload} className={btnBase} title="Download">
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <path d="M7.5 2v8.5M7.5 10.5l-3-3M7.5 10.5l3-3M2.5 13h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className={separatorClass} />

      {/* Zoom out */}
      <button onClick={zoomOut} className={btnBase} title="Zoom out">
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <circle cx="6.5" cy="6.5" r="4" stroke="currentColor" strokeWidth="1.5" />
          <path d="M9.5 9.5L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M4.5 6.5h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {/* Zoom percentage */}
      <button
        onClick={resetZoom}
        className={cn(
          "px-1.5 text-xs font-medium tabular-nums min-w-[3rem] text-center cursor-pointer rounded-md transition-colors",
          isDark
            ? "text-white/80 hover:text-white hover:bg-white/10"
            : "text-muted-foreground hover:text-foreground hover:bg-accent"
        )}
        title="Reset to fit"
      >
        {displayZoom ? `${displayZoom}%` : "Fit"}
      </button>

      {/* Zoom in */}
      <button onClick={zoomIn} className={btnBase} title="Zoom in">
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <circle cx="6.5" cy="6.5" r="4" stroke="currentColor" strokeWidth="1.5" />
          <path d="M9.5 9.5L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M4.5 6.5h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M6.5 4.5v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {/* Expand / Close */}
      {(onExpand || onClose) && (
        <>
          <div className={separatorClass} />
          {onExpand && (
            <button onClick={onExpand} className={btnBase} title="Expand">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 5V2h3M9 2h3v3M12 9v3h-3M5 12H2V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className={btnBase} title="Close">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </>
      )}
    </div>
  );
}

/* ---------- Fullscreen viewer ---------- */

function FullscreenViewer({
  imageUrl,
  styleName,
  zoom,
  onZoomChange,
  onClose,
  onDownload,
}: {
  imageUrl: string;
  styleName?: string | null;
  zoom: number | null;
  onZoomChange: (z: number | null) => void;
  onClose: () => void;
  onDownload: () => void;
}) {
  return (
    <DialogPrimitive.Root open onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-black/95 data-[state=open]:animate-in data-[state=open]:fade-in" />
        <DialogPrimitive.Content
          className="fixed inset-0 z-[60] flex flex-col"
          aria-describedby={undefined}
        >
          <VisuallyHidden.Root>
            <DialogPrimitive.Title>Infographic Preview</DialogPrimitive.Title>
          </VisuallyHidden.Root>

          {/* Toolbar row */}
          <div className="shrink-0 flex items-center justify-center py-3">
            <ZoomToolbar
              zoom={zoom}
              onZoomChange={onZoomChange}
              onDownload={onDownload}
              onClose={onClose}
              variant="dark"
            />
          </div>

          {/* Scrollable image area — always centered, scrollable in all directions */}
          <div className="flex-1 min-h-0 overflow-auto">
            {zoom !== null ? (
              <div className="min-h-full min-w-full w-max flex items-center justify-center p-6">
                <img
                  src={imageUrl}
                  alt="Generated infographic"
                  className="block shrink-0"
                  style={{ width: `${zoom}vw`, maxWidth: "none", height: "auto" }}
                  draggable={false}
                />
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center p-6">
                <img
                  src={imageUrl}
                  alt="Generated infographic"
                  className="block max-w-full max-h-full object-contain"
                  draggable={false}
                />
              </div>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
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
  zoom,
  onZoomChange,
  onFullscreen,
  onDownload,
  isCompleted,
}: {
  imageUrl: string | null | undefined;
  isGenerating: boolean;
  progress: number;
  zoom: number | null;
  onZoomChange: (z: number | null) => void;
  onFullscreen: () => void;
  onDownload: () => void;
  isCompleted: boolean;
}) {
  const [naturalW, setNaturalW] = useState(0);

  if (imageUrl) {
    const zoomedPx = zoom !== null && naturalW > 0 ? (naturalW * zoom) / 100 : null;

    return (
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        {/* Toolbar row */}
        {isCompleted && (
          <div className="shrink-0 flex items-center justify-center px-3 py-2 border-b border-border">
            <ZoomToolbar
              zoom={zoom}
              onZoomChange={onZoomChange}
              onDownload={onDownload}
              onExpand={onFullscreen}
              variant="light"
            />
          </div>
        )}

        {/* Scrollable image area — position:relative + absolute to fully contain overflow */}
        <div className="flex-1 relative min-h-0">
          <div className="absolute inset-0 overflow-auto">
            {zoomedPx !== null ? (
              /* Zoomed: w-max wrapper expands for scrolling */
              <div className="min-h-full min-w-full w-max flex items-center justify-center p-4">
                <img
                  src={imageUrl}
                  alt="Generated infographic"
                  className="block shrink-0 rounded-[var(--radius-md)]"
                  style={{ width: `${zoomedPx}px`, maxWidth: "none", height: "auto" }}
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    if (img.naturalWidth > 0) setNaturalW(img.naturalWidth);
                  }}
                  draggable={false}
                />
              </div>
            ) : (
              /* Fit: constrain to container, no scroll */
              <div className="w-full h-full flex items-center justify-center p-4">
                <img
                  src={imageUrl}
                  alt="Generated infographic"
                  className="block max-w-full max-h-full object-contain rounded-[var(--radius-md)] cursor-zoom-in"
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    if (img.naturalWidth > 0) setNaturalW(img.naturalWidth);
                  }}
                  onClick={isCompleted ? onFullscreen : undefined}
                  draggable={false}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
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
