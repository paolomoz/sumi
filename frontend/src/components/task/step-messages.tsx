import { Badge } from "@/components/ui/badge";

/* ---------- Analyzing ---------- */

interface AnalyzingDoneProps {
  data: {
    title?: string;
    data_type?: string;
    complexity?: string;
    preview?: string;
  };
}

export function AnalyzingDoneMessage({ data }: AnalyzingDoneProps) {
  return (
    <div className="text-sm leading-relaxed space-y-2">
      <p>
        I&rsquo;ve analyzed your content. This is about{" "}
        <strong>{data.title ?? "your topic"}</strong>
        {data.data_type || data.complexity ? " — " : "."}
        {data.data_type && (
          <>
            a <Badge className="bg-accent text-foreground">{data.data_type}</Badge>{" "}
            piece
          </>
        )}
        {data.complexity && (
          <>
            {" "}
            with <Badge className="bg-accent text-foreground">{data.complexity}</Badge>{" "}
            complexity
          </>
        )}
        {(data.data_type || data.complexity) && "."}
      </p>
      {data.preview && (
        <blockquote className="border-l-2 border-border pl-3 text-xs text-muted leading-relaxed line-clamp-3">
          {data.preview}
        </blockquote>
      )}
    </div>
  );
}

/* ---------- Structuring ---------- */

interface StructuringDoneProps {
  preview?: string;
}

export function StructuringDoneMessage({ preview }: StructuringDoneProps) {
  return (
    <div className="text-sm leading-relaxed space-y-2">
      <p>Content structured and organized. Here are the key points:</p>
      {preview && (
        <blockquote className="border-l-2 border-border pl-3 text-xs text-muted leading-relaxed line-clamp-3">
          {preview}
        </blockquote>
      )}
    </div>
  );
}

/* ---------- Recommending: Countdown ---------- */

import { useState, useEffect, useRef, useCallback } from "react";
import { confirmSelection } from "@/lib/api/client";
import { useStyles } from "@/lib/hooks/use-references";
import { cn } from "@/lib/utils";

const COUNTDOWN_SECONDS = 20;

interface StyleCountdownProps {
  jobId: string;
  recommendations: Array<{
    layout_id: string;
    style_id: string;
    style_name: string;
  }>;
  isAwaitingSelection: boolean;
}

export function StyleCountdown({
  jobId,
  recommendations,
  isAwaitingSelection,
}: StyleCountdownProps) {
  const [seconds, setSeconds] = useState(COUNTDOWN_SECONDS);
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null);
  const confirmedRef = useRef(false);
  const { data: allStyles } = useStyles();

  const bestMatch = recommendations[0];

  const confirmStyle = useCallback(async (styleId: string, layoutId: string) => {
    if (confirmedRef.current) return;
    confirmedRef.current = true;
    try {
      await confirmSelection(jobId, {
        layout_id: layoutId,
        style_id: styleId,
      });
    } catch {
      // pipeline uses default on timeout
    }
  }, [jobId]);

  const autoConfirm = useCallback(async () => {
    if (!bestMatch) return;
    await confirmStyle(bestMatch.style_id, bestMatch.layout_id);
  }, [bestMatch, confirmStyle]);

  useEffect(() => {
    if (!isAwaitingSelection || confirmedRef.current) return;

    const id = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          autoConfirm();
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [isAwaitingSelection, autoConfirm]);

  const handleStyleSelect = (styleId: string) => {
    if (!bestMatch || confirmedRef.current) return;
    setSelectedStyleId(styleId);
    confirmStyle(styleId, bestMatch.layout_id);
  };

  if (!isAwaitingSelection) return null;

  return (
    <div className="space-y-3">
      {/* Desktop: text prompt pointing to panel */}
      <div className="hidden lg:block text-sm leading-relaxed text-muted">
        Pick a style from the panel, or I&rsquo;ll choose one for you in{" "}
        <strong className="text-foreground">{seconds}s</strong>&hellip;
      </div>

      {/* Mobile: inline style picker */}
      <div className="lg:hidden space-y-3">
        <div className="text-sm leading-relaxed text-muted">
          Pick a style, or I&rsquo;ll choose one for you in{" "}
          <strong className="text-foreground">{seconds}s</strong>&hellip;
        </div>

        {allStyles && allStyles.length > 0 && (
          <div className="rounded-[var(--radius-lg)] border border-border bg-card p-3">
            <div className="max-h-48 overflow-y-auto -mr-1 pr-1">
              <div className="grid grid-cols-3 gap-2">
                {allStyles.map((style) => {
                  const isBestMatch = style.id === bestMatch?.style_id;
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
                        isSelected || (isBestMatch && !selectedStyleId)
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-border"
                      )}
                    >
                      {isBestMatch && !selectedStyleId && (
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Recommending: Selected ---------- */

interface StyleSelectedMessageProps {
  styleId: string;
  styleName: string;
}

export function StyleSelectedMessage({
  styleId,
  styleName,
}: StyleSelectedMessageProps) {
  return (
    <div className="inline-flex items-center gap-2.5 rounded-[var(--radius-md)] border-2 border-primary ring-2 ring-primary/20 px-3 py-2">
      <img
        src={`/styles/${styleId}.jpg`}
        alt=""
        className="h-8 w-8 rounded object-cover shrink-0"
      />
      <span className="text-sm font-medium">
        Selected: <strong>{styleName}</strong>
      </span>
    </div>
  );
}

/* ---------- Crafting ---------- */

interface CraftingDoneProps {
  preview?: string;
}

export function CraftingDoneMessage({ preview }: CraftingDoneProps) {
  return (
    <div className="text-sm leading-relaxed space-y-2">
      <p>
        Prompt ready. Generating your infographic with <strong>Nano Banana Pro 🍌</strong>&hellip;
      </p>
      {preview && (
        <blockquote className="border-l-2 border-border pl-3 text-xs text-muted leading-relaxed line-clamp-3">
          {preview}
        </blockquote>
      )}
    </div>
  );
}
