"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useGenerationStore } from "@/lib/stores/generation-store";
import { uploadFiles } from "@/lib/api/client";
import { cn } from "@/lib/utils";

const ACCEPTED_TYPES = ".md,.txt,.pdf";

export function StepTopic() {
  const { topic, setTopic, setStep } = useGenerationStore();
  const [localTopic, setLocalTopic] = useState(topic);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setUploading(true);
    setUploadError(null);

    try {
      const result = await uploadFiles(fileArray);
      const newTopic = localTopic
        ? localTopic + "\n\n" + result.text
        : result.text;
      setLocalTopic(newTopic);
      setUploadedFiles((prev) => [...prev, ...result.file_names]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [localTopic]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleNext = () => {
    if (!localTopic.trim()) return;
    setTopic(localTopic.trim());
    setStep("style");
  };

  const charCount = localTopic.length;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold mb-1">Describe your infographic</h2>
        <p className="text-sm text-muted">
          Describe a topic, paste a document, or attach files — we'll synthesize everything into a visual story.
        </p>
      </div>

      {/* Upload error */}
      {uploadError && (
        <div className="rounded-[var(--radius-md)] bg-red-50 p-3 text-sm text-destructive">
          {uploadError}
        </div>
      )}

      {/* Combined textarea + file upload container */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
        className={cn(
          "rounded-[var(--radius-lg)] border bg-card transition-all",
          dragOver
            ? "border-primary/50 shadow-md"
            : "border-border focus-within:border-primary/50"
        )}
      >
        {/* File chips */}
        {uploadedFiles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-3 pt-3 pb-0">
            {uploadedFiles.map((name, i) => (
              <span
                key={`${name}-${i}`}
                className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] bg-accent px-2 py-0.5 text-xs font-medium"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0">
                  <path d="M7 1H3.5A1.5 1.5 0 002 2.5v7A1.5 1.5 0 003.5 11h5A1.5 1.5 0 0010 9.5V4L7 1z" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {name}
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="ml-0.5 text-muted hover:text-foreground transition-colors"
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}

        <textarea
          value={localTopic}
          onChange={(e) => setLocalTopic(e.target.value)}
          placeholder="e.g., The photosynthesis process in plants, from sunlight absorption to glucose production..."
          className="w-full min-h-[120px] resize-y bg-transparent p-3 pb-0 text-sm placeholder:text-muted-foreground outline-none"
          autoFocus
        />

        {/* Bottom bar: + button left, char count right */}
        <div className="flex items-center justify-between px-2 py-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-[var(--radius-md)] transition-colors cursor-pointer",
              "text-muted-foreground hover:text-foreground hover:bg-accent",
              uploading && "opacity-50 cursor-not-allowed"
            )}
            aria-label="Attach file"
            title="Attach files (PDF, Markdown, Text)"
          >
            {uploading ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="animate-spin">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" strokeDasharray="28" strokeDashoffset="8" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            )}
          </button>

          {charCount > 0 && (
            <div className="text-xs text-muted tabular-nums">
              {charCount.toLocaleString()} chars
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <div className="flex justify-end">
        <Button onClick={handleNext} disabled={!localTopic.trim() || uploading}>
          Choose Style
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Button>
      </div>
    </div>
  );
}
