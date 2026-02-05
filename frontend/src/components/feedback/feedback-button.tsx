"use client";

import { useState, useRef, useEffect } from "react";
import { submitFeedback } from "@/lib/api/feedback";

type State = "closed" | "input" | "thanks";

export function FeedbackButton() {
  const [state, setState] = useState<State>("closed");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Focus textarea when opening
  useEffect(() => {
    if (state === "input" && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [state]);

  // Close on click outside
  useEffect(() => {
    if (state === "closed") return;

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setState("closed");
        setContent("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [state]);

  // No auto-close for thanks - user can click away or click the link

  const handleSubmit = async () => {
    if (content.length < 10 || isSubmitting) return;

    setIsSubmitting(true);
    setState("thanks");

    // Fire and forget - don't wait for response
    submitFeedback(content).catch(() => {
      // Silently fail - user already saw thank you
    });

    setIsSubmitting(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.metaKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") {
      setState("closed");
      setContent("");
    }
  };

  return (
    <div ref={popoverRef} className="fixed bottom-4 right-4 z-40">
      {/* Popover */}
      {state !== "closed" && (
        <div className="absolute bottom-14 right-0 w-72 bg-background border border-border rounded-lg shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
          {state === "input" && (
            <div className="p-3">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Found a bug or have an idea?"
                className="w-full h-20 p-2 text-sm rounded-md border border-border bg-background text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                maxLength={2000}
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-muted-foreground">
                  {content.length < 10 ? (
                    <span className="text-red-500">{content.length}/10 min</span>
                  ) : (
                    <span>⌘↵ to send</span>
                  )}
                </span>
                <button
                  onClick={handleSubmit}
                  disabled={content.length < 10}
                  className="px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-hover transition-colors"
                >
                  Send
                </button>
              </div>
            </div>
          )}

          {state === "thanks" && (
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-foreground">Thanks for your feedback</p>
              </div>
              <p className="text-xs text-muted-foreground">
                We'll keep you posted on how we use it.{" "}
                <a href="/feedback" className="text-primary hover:underline">
                  See past improvements
                </a>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Button */}
      <button
        onClick={() => setState(state === "closed" ? "input" : "closed")}
        className="w-12 h-12 rounded-full bg-primary text-white shadow-lg hover:bg-primary-hover transition-colors flex items-center justify-center"
        aria-label="Send feedback"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      </button>
    </div>
  );
}
