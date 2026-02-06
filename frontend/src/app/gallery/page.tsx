"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { useStyles } from "@/lib/hooks/use-references";
import { useStartGeneration } from "@/lib/hooks/use-generation";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Style } from "@/types/style";

const FAVOURITES_KEY = "sumi-favourite-styles";

function loadFavourites(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(FAVOURITES_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveFavourites(ids: Set<string>) {
  localStorage.setItem(FAVOURITES_KEY, JSON.stringify([...ids]));
}

export default function GalleryPage() {
  const { data: styles, isLoading } = useStyles();
  const [favourites, setFavourites] = useState<Set<string>>(new Set());
  const [showFavouritesOnly, setShowFavouritesOnly] = useState(false);
  const [generateStyle, setGenerateStyle] = useState<Style | null>(null);

  useEffect(() => {
    setFavourites(loadFavourites());
  }, []);

  const toggleFavourite = useCallback((styleId: string) => {
    setFavourites((prev) => {
      const next = new Set(prev);
      if (next.has(styleId)) {
        next.delete(styleId);
      } else {
        next.add(styleId);
      }
      saveFavourites(next);
      return next;
    });
  }, []);

  const displayStyles = showFavouritesOnly
    ? (styles ?? []).filter((s) => favourites.has(s.id))
    : styles ?? [];

  return (
    <div className="min-h-full px-4 sm:px-6 py-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Style Gallery
          </h1>
          <p className="text-sm text-muted mt-1">
            Browse all available styles. Favourite the ones you love, or jump
            straight into generating.
          </p>
        </div>

        {favourites.size > 0 && (
          <button
            onClick={() => setShowFavouritesOnly((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-[var(--radius-full)] border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
              showFavouritesOnly
                ? "border-red-300/50 bg-red-50 text-red-600"
                : "border-border hover:bg-accent"
            )}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill={showFavouritesOnly ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            {showFavouritesOnly ? "Show all" : `Favourites (${favourites.size})`}
          </button>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-[var(--radius-lg)] border border-border bg-card animate-pulse"
            >
              <div className="aspect-[4/3] bg-muted rounded-t-[var(--radius-lg)]" />
              <div className="p-4 space-y-2">
                <div className="h-4 w-1/3 bg-muted rounded" />
                <div className="h-3 w-2/3 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty favourites state */}
      {!isLoading && showFavouritesOnly && displayStyles.length === 0 && (
        <div className="text-center py-16 text-muted">
          <p className="text-sm">No favourites yet. Heart the styles you like!</p>
        </div>
      )}

      {/* Grid */}
      {!isLoading && displayStyles.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {displayStyles.map((style) => (
            <StyleCard
              key={style.id}
              style={style}
              isFavourite={favourites.has(style.id)}
              onToggleFavourite={() => toggleFavourite(style.id)}
              onGenerate={() => setGenerateStyle(style)}
            />
          ))}
        </div>
      )}

      {/* Generate dialog */}
      <GenerateDialog
        style={generateStyle}
        onClose={() => setGenerateStyle(null)}
      />
    </div>
  );
}

/* ─── Style Card ─── */

function StyleCard({
  style,
  isFavourite,
  onToggleFavourite,
  onGenerate,
}: {
  style: Style;
  isFavourite: boolean;
  onToggleFavourite: () => void;
  onGenerate: () => void;
}) {
  return (
    <div className="group relative rounded-[var(--radius-lg)] border border-border bg-card overflow-hidden transition-shadow hover:shadow-md">
      {/* Thumbnail */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={`/styles/${style.id}.jpg`}
          alt={style.name}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Favourite button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavourite();
          }}
          className={cn(
            "absolute top-2.5 right-2.5 flex h-8 w-8 items-center justify-center rounded-full transition-all cursor-pointer",
            isFavourite
              ? "bg-white/90 text-red-500 shadow-sm"
              : "bg-black/30 text-white opacity-0 group-hover:opacity-100 hover:bg-black/50"
          )}
          aria-label={isFavourite ? "Remove from favourites" : "Add to favourites"}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill={isFavourite ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>

        {/* Generate button on hover */}
        <button
          onClick={onGenerate}
          className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-[var(--radius-md)] bg-white px-3 py-1.5 text-xs font-medium text-gray-900 shadow-sm opacity-0 group-hover:opacity-100 transition-all hover:bg-gray-50 cursor-pointer"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            className="shrink-0"
          >
            <path
              d="M8 3v10M3 8h10"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          Generate
        </button>
      </div>

      {/* Info */}
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-medium truncate">{style.name}</h3>
            {style.best_for && (
              <p className="text-xs text-muted mt-0.5 line-clamp-1">
                {style.best_for}
              </p>
            )}
          </div>
          <button
            onClick={onGenerate}
            className="shrink-0 inline-flex items-center gap-1 rounded-[var(--radius-md)] border border-border px-2.5 py-1 text-xs font-medium hover:bg-accent transition-colors cursor-pointer"
          >
            Use style
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Generate Dialog ─── */

function GenerateDialog({
  style,
  onClose,
}: {
  style: Style | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const startGeneration = useStartGeneration();
  const [topic, setTopic] = useState("");
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  // Reset form when style changes
  useEffect(() => {
    if (style) {
      setTopic("");
      startGeneration.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [style?.id]);

  const handleSubmit = async () => {
    const trimmed = topic.trim();
    if (!trimmed || !style) return;

    if (!session) {
      setShowAuthPrompt(true);
      return;
    }

    try {
      const result = await startGeneration.mutateAsync({
        topic: trimmed,
        style_id: style.id,
      });
      onClose();
      router.push(`/task/${result.job_id}`);
    } catch {
      // error handled by mutation state
    }
  };

  return (
    <>
      <Dialog open={!!style} onOpenChange={(open) => !open && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate with {style?.name}</DialogTitle>
          </DialogHeader>

          {style && (
            <div className="space-y-4">
              {/* Style preview */}
              <div className="flex items-center gap-3">
                <img
                  src={`/styles/${style.id}.jpg`}
                  alt={style.name}
                  className="w-16 h-12 rounded-[var(--radius-md)] object-cover border border-border"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{style.name}</p>
                  {style.best_for && (
                    <p className="text-xs text-muted truncate">{style.best_for}</p>
                  )}
                </div>
              </div>

              {/* Topic input */}
              <div>
                <label className="text-xs font-medium text-muted mb-1.5 block">
                  What should the infographic be about?
                </label>
                <textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                  placeholder="Describe your infographic topic..."
                  rows={3}
                  autoFocus
                  className="w-full resize-none rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                />
              </div>

              {/* Error */}
              {startGeneration.isError && (
                <p className="text-xs text-red-500">
                  {startGeneration.error?.message || "Failed to start generation"}
                </p>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={onClose}
                  className="px-3 py-2 rounded-[var(--radius-md)] text-sm font-medium border border-border hover:bg-accent transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!topic.trim() || startGeneration.isPending}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-md)] text-sm font-medium transition-colors cursor-pointer",
                    "bg-foreground text-background hover:bg-foreground/90",
                    (!topic.trim() || startGeneration.isPending) &&
                      "opacity-50 cursor-not-allowed"
                  )}
                >
                  {startGeneration.isPending ? (
                    <>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 16 16"
                        fill="none"
                        className="animate-spin"
                      >
                        <circle
                          cx="8"
                          cy="8"
                          r="6"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeDasharray="28"
                          strokeDashoffset="8"
                          strokeLinecap="round"
                        />
                      </svg>
                      Starting...
                    </>
                  ) : (
                    "Generate"
                  )}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Auth prompt */}
      {showAuthPrompt && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md mx-4 rounded-[var(--radius-lg)] border border-border bg-card p-6 shadow-xl">
            <div className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="text-foreground"
                >
                  <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
                  <path
                    d="M4 20c0-4 4-6 8-6s8 2 8 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
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
                  Continue with Google
                </button>
                <button
                  onClick={() => signIn("github")}
                  className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border border-border px-4 py-2.5 text-sm font-medium hover:bg-accent transition-colors cursor-pointer"
                >
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
    </>
  );
}
