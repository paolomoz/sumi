"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChatInput } from "@/components/chat/chat-input";
import { useStartGeneration } from "@/lib/hooks/use-generation";

interface HomeHeroProps {
  preselectedStyle?: { id: string; name: string } | null;
  onClearStyle?: () => void;
}

export function HomeHero({ preselectedStyle, onClearStyle }: HomeHeroProps) {
  const router = useRouter();
  const startGeneration = useStartGeneration();
  const [skillActive, setSkillActive] = useState(false);

  const handleSubmit = async (text: string) => {
    try {
      const result = await startGeneration.mutateAsync({
        topic: text,
        ...(preselectedStyle ? { style_id: preselectedStyle.id } : {}),
      });
      onClearStyle?.();
      router.push(`/task/${result.job_id}`);
    } catch {
      // error handled by mutation state
    }
  };

  return (
    <div className="space-y-4">
      <ChatInput
        onSubmit={handleSubmit}
        placeholder="Describe your infographic topic..."
        disabled={startGeneration.isPending}
        skillActive={skillActive}
        onSkillDeactivate={() => setSkillActive(false)}
        styleChip={preselectedStyle}
        onStyleChipRemove={onClearStyle}
      />
      {startGeneration.isError && (
        <p className="text-xs text-red-500 text-center">
          {startGeneration.error?.message || "Failed to start generation"}
        </p>
      )}

      {/* Skill chips — invisible (but space-preserving) when a skill is active */}
      <div className={`flex flex-wrap justify-center gap-2 transition-opacity ${skillActive ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
        <button
          type="button"
          onClick={() => setSkillActive(true)}
          tabIndex={skillActive ? -1 : 0}
          className="inline-flex items-center gap-1.5 rounded-[var(--radius-full)] border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors cursor-pointer hover:bg-accent"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
            <rect x="1" y="2" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.3" />
            <path d="M1 5h12" stroke="currentColor" strokeWidth="1.3" />
            <path d="M4.5 7.5h5M4.5 9.5h3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
          </svg>
          Create Infographic
        </button>
        <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-full)] border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground opacity-50 cursor-default select-none">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
            <polygon points="5.5,3 5.5,11 11,7" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" fill="none" />
            <line x1="3" y1="3" x2="3" y2="11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          Create Video Podcast
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-full)] border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground opacity-50 cursor-default select-none">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
            <rect x="2" y="3" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
            <path d="M5 6l2 1.5L5 9V6z" fill="currentColor" />
            <path d="M5 12h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          Create Demo
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-full)] border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground opacity-50 cursor-default select-none">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
            <circle cx="5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.2" />
            <circle cx="9.5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.2" />
            <path d="M3 10.5c0-1.5 1.5-2.5 4-2.5s4 1 4 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          Create Visual Meeting Recap
        </span>
      </div>
    </div>
  );
}
