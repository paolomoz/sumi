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
      // Append extracted text to existing content
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

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

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
          Describe a topic, paste a document, or upload files — we'll synthesize everything into a visual story.
        </p>
      </div>

      {/* File drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "flex items-center justify-center gap-2 rounded-[var(--radius-lg)] border-2 border-dashed p-4 cursor-pointer transition-all text-sm",
          dragOver
            ? "border-primary bg-primary/5 text-primary"
            : "border-border text-muted hover:border-primary/40 hover:text-foreground"
        )}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0">
          <path d="M9 2v10M5 6l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M3 12v2a2 2 0 002 2h8a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {uploading ? (
          <span>Extracting text...</span>
        ) : (
          <span>Drop files here or click to browse <span className="text-muted">(PDF, Markdown, Text)</span></span>
        )}
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

      {/* Uploaded file chips */}
      {uploadedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {uploadedFiles.map((name, i) => (
            <span
              key={`${name}-${i}`}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-full)] bg-accent px-3 py-1 text-xs font-medium"
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

      {/* Upload error */}
      {uploadError && (
        <div className="rounded-[var(--radius-md)] bg-red-50 p-3 text-sm text-destructive">
          {uploadError}
        </div>
      )}

      {/* Topic textarea */}
      <div className="relative">
        <textarea
          value={localTopic}
          onChange={(e) => setLocalTopic(e.target.value)}
          placeholder="e.g., The photosynthesis process in plants, from sunlight absorption to glucose production..."
          className="w-full min-h-[120px] resize-y rounded-[var(--radius-lg)] border border-border bg-card p-4 pb-8 text-sm placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-primary"
          autoFocus
        />
        {charCount > 0 && (
          <div className="absolute bottom-2 right-3 text-xs text-muted tabular-nums">
            {charCount.toLocaleString()} chars
          </div>
        )}
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
