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
  const confirmedRef = useRef(false);

  const autoConfirm = useCallback(async () => {
    if (confirmedRef.current) return;
    confirmedRef.current = true;
    const rec = recommendations[0];
    if (!rec) return;
    try {
      await confirmSelection(jobId, {
        layout_id: rec.layout_id,
        style_id: rec.style_id,
      });
    } catch {
      // pipeline uses default on timeout
    }
  }, [jobId, recommendations]);

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

  if (!isAwaitingSelection) return null;

  return (
    <div className="text-sm leading-relaxed text-muted">
      Pick a style from the panel, or I&rsquo;ll choose one for you in{" "}
      <strong className="text-foreground">{seconds}s</strong>&hellip;
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
