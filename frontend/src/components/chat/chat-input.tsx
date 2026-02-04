"use client";

import { useState, useRef, useCallback, KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { uploadFiles } from "@/lib/api/client";

const ACCEPTED_TYPES = ".md,.txt,.pdf";

interface ChatInputProps {
  onSubmit: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ChatInput({ onSubmit, placeholder, disabled }: ChatInputProps) {
  const [value, setValue] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, []);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setUploading(true);
    try {
      const result = await uploadFiles(fileArray);
      setValue((prev) => prev ? prev + "\n\n" + result.text : result.text);
      setUploadedFiles((prev) => [...prev, ...result.file_names]);
      setTimeout(adjustHeight, 0);
    } catch {
      // Silently fail for home input
    } finally {
      setUploading(false);
    }
  }, [adjustHeight]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled || uploading) return;
    onSubmit(trimmed);
    setValue("");
    setUploadedFiles([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
        className={cn(
          "rounded-[var(--radius-lg)] border bg-card p-2 shadow-sm transition-all",
          dragOver
            ? "border-primary/50 shadow-md"
            : "border-border focus-within:border-primary/50 focus-within:shadow-md"
        )}
      >
        {/* File chips */}
        {uploadedFiles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-2 pt-1 pb-1">
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
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            adjustHeight();
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "Describe your infographic..."}
          disabled={disabled}
          rows={1}
          className={cn(
            "w-full resize-none border-0 bg-transparent px-2 py-2 text-sm outline-none",
            "placeholder:text-muted-foreground",
            "disabled:opacity-50"
          )}
        />

        {/* Bottom bar: + button left, send button right */}
        <div className="flex items-center justify-between px-1">
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

          <button
            onClick={handleSubmit}
            disabled={!value.trim() || disabled || uploading}
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-md)] transition-colors cursor-pointer",
              value.trim()
                ? "bg-foreground text-background hover:bg-foreground/90"
                : "text-muted-foreground"
            )}
            aria-label="Send"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 12V4M8 4L4 8M8 4l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
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
    </div>
  );
}
