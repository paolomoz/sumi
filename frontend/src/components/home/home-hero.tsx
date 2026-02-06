"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { ChatInput } from "@/components/chat/chat-input";
import { useStartGeneration } from "@/lib/hooks/use-generation";

interface HomeHeroProps {
  preselectedStyle?: { id: string; name: string } | null;
  onClearStyle?: () => void;
}

export function HomeHero({ preselectedStyle, onClearStyle }: HomeHeroProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const startGeneration = useStartGeneration();
  const [skillActive, setSkillActive] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [pendingTopic, setPendingTopic] = useState("");

  const handleSubmit = async (text: string, mode: string) => {
    // Check if user is logged in
    if (!session) {
      setPendingTopic(text);
      setShowAuthPrompt(true);
      return;
    }

    try {
      const result = await startGeneration.mutateAsync({
        topic: text,
        mode,
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
        disabled={startGeneration.isPending || status === "loading"}
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

      {/* Auth prompt modal */}
      {showAuthPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md mx-4 rounded-[var(--radius-lg)] border border-border bg-card p-6 shadow-xl">
            <div className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-foreground">
                  <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
                  <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold">Sign in to continue</h2>
                <p className="text-sm text-muted mt-1">
                  Create an account to generate infographics and save your history.
                </p>
              </div>
              <div className="space-y-2 pt-2">
                <button
                  onClick={() => signIn("google")}
                  className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-foreground text-background px-4 py-2.5 text-sm font-medium hover:bg-foreground/90 transition-colors cursor-pointer"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M16.354 7.363H15.75V7.313H9v3.375h4.239a5.063 5.063 0 0 1-9.739-1.875 5.063 5.063 0 0 1 5.063-5.063c1.279 0 2.441.483 3.327 1.27l2.387-2.387A8.438 8.438 0 0 0 9 .563a8.438 8.438 0 1 0 7.354 6.8Z" fill="currentColor" />
                  </svg>
                  Continue with Google
                </button>
                <button
                  onClick={() => signIn("github")}
                  className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border border-border px-4 py-2.5 text-sm font-medium hover:bg-accent transition-colors cursor-pointer"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M9 1.125a7.875 7.875 0 0 0-2.49 15.345c.394.073.538-.17.538-.379 0-.187-.007-.681-.011-1.338-2.19.476-2.651-1.055-2.651-1.055-.358-.909-.874-1.15-.874-1.15-.714-.488.054-.478.054-.478.79.056 1.206.81 1.206.81.702 1.203 1.841.855 2.29.654.071-.508.274-.856.499-1.053-1.748-.199-3.586-.874-3.586-3.888 0-.859.307-1.561.81-2.11-.081-.199-.35-.998.077-2.081 0 0 .66-.211 2.163.806A7.527 7.527 0 0 1 9 4.929c.668.003 1.341.09 1.97.266 1.502-1.017 2.161-.806 2.161-.806.428 1.083.159 1.882.078 2.08.504.55.809 1.252.809 2.111 0 3.021-1.84 3.686-3.593 3.881.282.243.534.723.534 1.458 0 1.052-.01 1.901-.01 2.16 0 .211.143.456.542.378A7.876 7.876 0 0 0 9 1.125Z" fill="currentColor" />
                  </svg>
                  Continue with GitHub
                </button>
              </div>
              <button
                onClick={() => setShowAuthPrompt(false)}
                className="text-sm text-muted hover:text-foreground transition-colors cursor-pointer pt-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
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
