"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { submitFeedback, createFeedbackSSE, FeedbackSSEEvent } from "@/lib/api/feedback";

type DialogState = "input" | "processing" | "success" | "thank_you" | "error";

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
  const [state, setState] = useState<DialogState>("input");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [prUrl, setPrUrl] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setState("input");
    setContent("");
    setError(null);
    setProgress(0);
    setStatusMessage("");
    setPrUrl(null);
  }, []);

  useEffect(() => {
    if (!open) {
      // Reset state when dialog closes
      const timeout = setTimeout(resetState, 300);
      return () => clearTimeout(timeout);
    }
  }, [open, resetState]);

  const handleSubmit = async () => {
    if (content.length < 20) {
      setError("Please provide more detail (at least 20 characters)");
      return;
    }

    setState("processing");
    setError(null);
    setStatusMessage("Submitting feedback...");

    try {
      const { feedback_id } = await submitFeedback(content);

      // Connect to SSE for updates
      const eventSource = createFeedbackSSE(feedback_id);

      eventSource.addEventListener("status", (event) => {
        const data: FeedbackSSEEvent = JSON.parse(event.data);
        setProgress(data.progress * 100);
        setStatusMessage(data.message);

        if (data.pr_url) {
          setPrUrl(data.pr_url);
        }

        if (data.status === "completed") {
          setState("success");
          eventSource.close();
        } else if (data.status === "rejected") {
          setState("thank_you");
          eventSource.close();
        } else if (data.status === "failed") {
          setError(data.message || "Something went wrong");
          setState("error");
          eventSource.close();
        }
      });

      eventSource.onerror = () => {
        // SSE connection error - check status via polling
        eventSource.close();
        setState("error");
        setError("Connection lost. Your feedback was received.");
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit feedback");
      setState("error");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {state === "input" && "Send Feedback"}
            {state === "processing" && "Processing Feedback"}
            {state === "success" && "PR Created!"}
            {state === "thank_you" && "Thank You!"}
            {state === "error" && "Oops!"}
          </DialogTitle>
        </DialogHeader>

        {/* Input State */}
        {state === "input" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Found a bug or have an idea? Let me know and I might create a PR to fix it.
            </p>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Describe the issue or suggestion..."
              className="w-full h-32 p-3 rounded-[var(--radius-md)] border border-border bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              maxLength={2000}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {content.length}/2000
              </span>
              <Button onClick={handleSubmit} disabled={content.length < 20}>
                Submit
              </Button>
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
        )}

        {/* Processing State */}
        {state === "processing" && (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3">
              <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
              <span className="text-sm">{statusMessage}</span>
            </div>
            <div className="w-full bg-accent rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Success State */}
        {state === "success" && (
          <div className="space-y-4 py-4 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-medium">Pull Request Created</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your feedback has been turned into a PR!
              </p>
            </div>
            {prUrl && (
              <a
                href={prUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary hover:underline"
              >
                View Pull Request
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        )}

        {/* Thank You State (non-actionable feedback) */}
        {state === "thank_you" && (
          <div className="space-y-4 py-4 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-pink-600 dark:text-pink-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </div>
            <div>
              <p className="font-medium">Thanks for your feedback!</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your message has been received. We appreciate you taking the time to share.
              </p>
            </div>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        )}

        {/* Error State */}
        {state === "error" && (
          <div className="space-y-4 py-4 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div>
              <p className="font-medium">Something went wrong</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
            <div className="flex gap-2 justify-center">
              <Button variant="secondary" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button onClick={() => setState("input")}>
                Try Again
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
