"use client";

import { useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStartRestyle } from "@/lib/hooks/use-generation";
import { useInvalidateHistory } from "@/lib/hooks/use-history";
import { useStyles } from "@/lib/hooks/use-references";
import { ActivityCard } from "./activity-card";
import {
  AnalyzingDoneMessage,
  StructuringDoneMessage,
  StyleCountdown,
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
  "recommending",
  "crafting",
  "generating",
] as const;

const STATUS_TO_STEP_INDEX: Record<string, number> = {
  queued: -1,
  analyzing: 0,
  structuring: 1,
  recommending: 2,
  awaiting_selection: 2,
  crafting: 3,
  generating: 4,
  completed: 5,
  failed: 5,
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
  recommending: {
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1.5" y="1.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="9.5" y="1.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="1.5" y="9.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="9.5" y="9.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
    title: "Finding style combinations",
    subtitle: "Exploring visual styles\u2026",
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
    !!stepData.recommending,
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
        elements.push(
          <StructuringDoneMessage
            key="structuring-done"
            preview={stepData.structuring?.preview}
          />
        );
      } else if (step === "recommending") {
        // After selection is done, show the selected style as a compact card
        // Use result if available (completed), then selection step data, then fall back to best_match rec
        const selStyleId = result?.style_id ?? stepData.selection?.style_id ?? stepData.recommending?.recommendations?.[0]?.style_id;
        const selStyleName = result?.style_name ?? stepData.selection?.style_name ?? stepData.recommending?.recommendations?.[0]?.style_name;
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

    // Recommending special case: show countdown when awaiting selection
    if (
      step === "recommending" &&
      stepStatus === "active" &&
      status === "awaiting_selection" &&
      stepData.recommending?.recommendations &&
      stepData.recommending.recommendations.length > 0
    ) {
      elements.push(
        <StyleCountdown
          key="style-countdown"
          jobId={jobId}
          recommendations={stepData.recommending.recommendations}
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
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-medium bg-accent hover:bg-accent/80 transition-colors cursor-pointer"
                    >
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
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
