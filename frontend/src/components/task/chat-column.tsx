"use client";

import { useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStartGeneration, useStartRestyle } from "@/lib/hooks/use-generation";
import { useInvalidateHistory } from "@/lib/hooks/use-history";
import { useStyles } from "@/lib/hooks/use-references";
import { ActivityCard } from "./activity-card";
import {
  AnalyzingDoneMessage,
  StructuringDoneMessage,
  StyleSelectedMessage,
  CraftingDoneMessage,
} from "./step-messages";
import { StylePicker } from "./style-picker";
import { Chip } from "@/components/ui/chip";
import { StepDataMap } from "@/types/generation";
import { cn } from "@/lib/utils";
import { downloadFile } from "@/lib/utils";

type StepStatus = "pending" | "active" | "done";

const STEP_ORDER = [
  "analyzing",
  "structuring",
  "crafting",
  "generating",
] as const;

const STATUS_TO_STEP_INDEX: Record<string, number> = {
  queued: -1,
  analyzing: 0,
  structuring: 1,
  awaiting_selection: 1,
  crafting: 2,
  generating: 3,
  completed: 4,
  failed: 4,
};

/* ---- Per-step activity card config ---- */

const STEP_ACTIVITY: Record<
  string,
  { icon: React.ReactNode; title: string; subtitle: string }
> = {
  analyzing: {
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    title: "Analyzing your topic",
    subtitle: "Reading through your content\u2026",
  },
  structuring: {
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 4h12M2 8h9M2 12h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    title: "Structuring content",
    subtitle: "Organizing the key information\u2026",
  },
  crafting: {
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M9.5 2.5l4 4-8.5 8.5H1v-4L9.5 2.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
    title: "Crafting prompt",
    subtitle: "Writing the design instructions\u2026",
  },
  generating: {
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1.5" y="1.5" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="5.5" cy="5.5" r="1.5" fill="currentColor" />
        <path d="M1.5 11l3.5-3 3 2.5 2.5-2 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: "Generating infographic",
    subtitle: "Painting with Nano Banana Pro \ud83c\udf4c\u2026",
  },
};

interface ChatColumnProps {
  jobId: string;
  topic: string;
  status: string;
  progress: number;
  message: string;
  stepData: StepDataMap;
  result: {
    image_url: string | null;
    layout_id: string | null;
    layout_name: string | null;
    style_id: string | null;
    style_name: string | null;
    mode?: string | null;
  } | null;
  error: string | null;
}

export function ChatColumn({
  jobId,
  topic,
  status,
  progress,
  message,
  stepData,
  result,
  error,
}: ChatColumnProps) {
  const router = useRouter();
  const startGeneration = useStartGeneration();
  const startRestyle = useStartRestyle();
  const invalidateHistory = useInvalidateHistory();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showStylePicker, setShowStylePicker] = useState(false);

  // Fetch styles for restyle picker
  const { data: allStyles } = useStyles();

  const currentStepIndex = STATUS_TO_STEP_INDEX[status] ?? -1;
  const isCompleted = status === "completed";
  const isFailed = status === "failed";

  function getStepStatus(stepIndex: number): StepStatus {
    if (stepIndex < currentStepIndex) return "done";
    if (stepIndex === currentStepIndex) return "active";
    return "pending";
  }

  // Auto-scroll to bottom when new content appears
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
    if (isNearBottom) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [
    currentStepIndex,
    status,
    showStylePicker,
    !!result,
    !!stepData.analyzing,
    !!stepData.structuring,
    !!stepData.crafting,
  ]);

  const handleRestyle = () => {
    setShowStylePicker(true);
  };

  const handleRestyleConfirm = async (styleId: string) => {
    try {
      const res = await startRestyle.mutateAsync({
        jobId,
        style_id: styleId,
        layout_id: result?.layout_id ?? undefined,
      });
      invalidateHistory();
      router.push(`/task/${res.job_id}`);
    } catch {
      // error shown in UI
    }
  };

  const handleNew = () => {
    router.push("/");
  };

  const handleTryOtherMode = async () => {
    const currentMode = result?.mode || "detailed";
    const oppositeMode = currentMode === "detailed" ? "fast" : "detailed";
    try {
      const res = await startGeneration.mutateAsync({
        topic,
        style_id: result?.style_id ?? undefined,
        layout_id: result?.layout_id ?? undefined,
        mode: oppositeMode,
      });
      invalidateHistory();
      router.push(`/task/${res.job_id}`);
    } catch {
      // error shown in UI
    }
  };

  // Build elements
  const elements: React.ReactNode[] = [];

  // User message bubble
  if (topic) {
    elements.push(
      <div key="user-msg" className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-foreground text-background px-4 py-3">
          <p className="text-sm leading-relaxed whitespace-pre-wrap line-clamp-6">
            {topic}
          </p>
        </div>
      </div>
    );
  }

  // AI opening text (no bubble wrapper)
  if (currentStepIndex >= 0) {
    elements.push(
      <div key="ai-start" className="text-sm leading-relaxed">
        {stepData.analyzing?.title
          ? <>Let me create an infographic about &ldquo;{stepData.analyzing.title}&rdquo;.</>
          : "Starting your infographic\u2026"}
      </div>
    );
  }

  // Render each step as individual card + done message interleaved
  STEP_ORDER.forEach((step, i) => {
    if (currentStepIndex < 0) return;

    const stepStatus = getStepStatus(i);
    const cfg = STEP_ACTIVITY[step];

    // Render the step card (always visible once generation starts)
    elements.push(
      <ActivityCard
        key={`card-${step}`}
        icon={cfg.icon}
        title={cfg.title}
        subtitle={cfg.subtitle}
        state={isCompleted || isFailed ? "done" : stepStatus}
      />
    );

    // Shimmer status message right below the active step
    if (!isCompleted && !isFailed && stepStatus === "active" && message) {
      elements.push(
        <p key="shimmer-msg" className="text-xs text-shimmer">{message}</p>
      );
    }

    // Render done message right after its card
    if (stepStatus === "done") {
      if (step === "analyzing" && stepData.analyzing) {
        elements.push(
          <AnalyzingDoneMessage key="analyzing-done" data={stepData.analyzing} />
        );
      } else if (step === "structuring") {
        // After structuring is done and selection happened, show the selected style
        const selStyleId = result?.style_id ?? stepData.selection?.style_id;
        const selStyleName = result?.style_name ?? stepData.selection?.style_name;
        elements.push(
          <StructuringDoneMessage
            key="structuring-done"
            preview={stepData.structuring?.preview}
          />
        );
        if (selStyleId && selStyleName) {
          elements.push(
            <StyleSelectedMessage
              key="style-selected"
              styleId={selStyleId}
              styleName={selStyleName}
            />
          );
        }
      } else if (step === "crafting") {
        elements.push(
          <CraftingDoneMessage
            key="crafting-done"
            preview={stepData.crafting?.preview}
          />
        );
      }
    }

    // Show style picker prompt when awaiting selection (after structuring step)
    if (
      step === "structuring" &&
      stepStatus === "active" &&
      status === "awaiting_selection"
    ) {
      elements.push(
        <StylePickerPrompt
          key="style-picker-prompt"
          jobId={jobId}
          isAwaitingSelection={status === "awaiting_selection"}
        />
      );
    }
  });

  return (
    <div className="flex w-full lg:w-[420px] xl:w-[480px] shrink-0 flex-col min-h-0">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 scroll-smooth">
        <div className="space-y-4">
          {elements}

          {/* Error display */}
          {isFailed && error && (
            <div className="rounded-[var(--radius-lg)] border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20 px-4 py-3">
              <p className="text-sm text-red-700 dark:text-red-400">
                Generation failed: {error}
              </p>
            </div>
          )}

          {/* Completion */}
          {isCompleted && result && (
            <>
              <div className="text-sm leading-relaxed text-primary">
                Your infographic is ready!
                {result.style_name && (
                  <> Generated with the <strong>{result.style_name}</strong> style.</>
                )}
              </div>

              {/* Mobile inline preview (hidden on lg) */}
              {result.image_url && (
                <div className="lg:hidden rounded-[var(--radius-lg)] border border-border overflow-hidden bg-card">
                  <img
                    src={result.image_url}
                    alt="Generated infographic"
                    className="w-full h-auto"
                  />
                  <div className="flex items-center justify-center gap-3 p-3 border-t border-border">
                    <button
                      onClick={() =>
                        downloadFile(
                          result.image_url!,
                          `sumi-infographic-${Date.now()}.png`
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-md)] text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M7 2v8M7 10l-3-3M7 10l3-3M2 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Download
                    </button>
                  </div>
                </div>
              )}

              {/* Style picker for restyle */}
              {showStylePicker && allStyles ? (
                <div className="rounded-[var(--radius-lg)] border border-border bg-card p-4">
                  <p className="text-xs font-medium mb-3">Pick a new style</p>
                  <StylePicker
                    styles={allStyles}
                    onSelect={handleRestyleConfirm}
                    onCancel={() => setShowStylePicker(false)}
                    confirmLabel="Generate"
                  />
                </div>
              ) : (
                /* Action chips */
                <div className="flex flex-wrap gap-2">
                  <Chip
                    variant="primary"
                    onClick={handleRestyle}
                    disabled={startRestyle.isPending}
                  >
                    Try Different Style
                  </Chip>
                  <Chip
                    variant="outline"
                    onClick={handleTryOtherMode}
                    disabled={startGeneration.isPending}
                  >
                    {(result?.mode || "detailed") === "detailed" ? (
                      <>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0">
                          <path d="M6.5 1L3 7h3l-.5 4L9 5H6l.5-4z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Try Fast Mode
                      </>
                    ) : (
                      <>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0">
                          <path d="M6 1l1.1 2.5L10 4l-2 2 .5 3L6 7.5 3.5 9l.5-3-2-2 2.9-.5L6 1z" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Try Detailed Mode
                      </>
                    )}
                  </Chip>
                  <Chip variant="outline" onClick={handleNew}>
                    New Infographic
                  </Chip>
                  <Chip variant="outline" disabled>
                    Add Talk Track
                    <span className="text-[10px] font-normal text-muted opacity-70">soon</span>
                  </Chip>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}

/* ---- Inline style picker prompt (shown during awaiting_selection) ---- */

import { confirmSelection } from "@/lib/api/client";

function StylePickerPrompt({
  jobId,
  isAwaitingSelection,
}: {
  jobId: string;
  isAwaitingSelection: boolean;
}) {
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null);
  const confirmedRef = useRef(false);
  const { data: allStyles } = useStyles();

  const handleStyleSelect = async (styleId: string) => {
    if (confirmedRef.current) return;
    setSelectedStyleId(styleId);
    confirmedRef.current = true;
    try {
      await confirmSelection(jobId, {
        layout_id: "bento-grid", // default layout
        style_id: styleId,
      });
    } catch {
      // fallback
    }
  };

  if (!isAwaitingSelection) return null;

  return (
    <div className="space-y-3">
      {/* Desktop: text prompt pointing to panel */}
      <div className="hidden lg:block text-sm leading-relaxed text-muted">
        Pick a style from the panel to continue.
      </div>

      {/* Mobile: inline style picker */}
      <div className="lg:hidden space-y-3">
        <div className="text-sm leading-relaxed text-muted">
          Pick a style to continue.
        </div>

        {allStyles && allStyles.length > 0 && (
          <div className="rounded-[var(--radius-lg)] border border-border bg-card p-3">
            <div className="max-h-48 overflow-y-auto -mr-1 pr-1">
              <div className="grid grid-cols-3 gap-2">
                {allStyles.map((style) => {
                  const isSelected = selectedStyleId === style.id;
                  return (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => handleStyleSelect(style.id)}
                      disabled={confirmedRef.current}
                      className={cn(
                        "relative text-left rounded-[var(--radius-md)] border p-1.5 transition-all cursor-pointer",
                        "hover:border-primary/50 hover:shadow-sm",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        isSelected
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-border"
                      )}
                    >
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
