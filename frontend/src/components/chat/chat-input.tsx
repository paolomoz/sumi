"use client";

import { useState, useRef, useCallback, useEffect, KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { uploadFiles } from "@/lib/api/client";

const ACCEPTED_TYPES = ".md,.txt,.pdf";

interface ChatInputProps {
  onSubmit: (text: string, mode: string) => void;
  placeholder?: string;
  disabled?: boolean;
  skillActive?: boolean;
  onSkillDeactivate?: () => void;
  styleChip?: { id: string; name: string } | null;
  onStyleChipRemove?: () => void;
}

export function ChatInput({ onSubmit, placeholder, disabled, skillActive, onSkillDeactivate, styleChip, onStyleChipRemove }: ChatInputProps) {
  const [value, setValue] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [mode, setMode] = useState<"detailed" | "fast">("detailed");
  const [modeMenuOpen, setModeMenuOpen] = useState(false);

  // Sync mode from localStorage on mount (avoids hydration mismatch)
  useEffect(() => {
    const saved = localStorage.getItem("sumi-generation-mode") as "detailed" | "fast" | null;
    if (saved && saved !== mode) setMode(saved);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const modeMenuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!addMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setAddMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [addMenuOpen]);

  // Close mode menu on outside click
  useEffect(() => {
    if (!modeMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (modeMenuRef.current && !modeMenuRef.current.contains(e.target as Node)) {
        setModeMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [modeMenuOpen]);

  const handleModeChange = (newMode: "detailed" | "fast") => {
    setMode(newMode);
    localStorage.setItem("sumi-generation-mode", newMode);
    setModeMenuOpen(false);
  };

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 320)}px`;
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
    onSubmit(trimmed, mode);
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
          rows={4}
          className={cn(
            "w-full resize-none border-0 bg-transparent px-2 py-2 text-sm outline-none",
            "placeholder:text-muted-foreground",
            "disabled:opacity-50"
          )}
        />

        {/* Bottom bar: + button left, skill chips center, send button right */}
        <div className="flex items-center gap-1 px-1">
          <div className="relative" ref={addMenuRef}>
            <button
              type="button"
              onClick={() => setAddMenuOpen((v) => !v)}
              disabled={uploading}
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors cursor-pointer",
                addMenuOpen
                  ? "border-foreground/30 text-foreground bg-accent"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 hover:bg-accent",
                uploading && "opacity-50 cursor-not-allowed"
              )}
              aria-label="Add"
              title="Add files"
            >
              {uploading ? (
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="animate-spin">
                  <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" strokeDasharray="28" strokeDashoffset="8" strokeLinecap="round" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              )}
            </button>

            {/* Add menu popover */}
            {addMenuOpen && (
              <div className="absolute top-full left-0 mt-2 w-56 rounded-[var(--radius-md)] border border-border bg-card shadow-lg py-1 z-10">
                <button
                  type="button"
                  onClick={() => {
                    setAddMenuOpen(false);
                    fileInputRef.current?.click();
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors cursor-pointer"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 text-muted-foreground">
                    <path d="M8.5 1.5H4.5A1.5 1.5 0 003 3v10a1.5 1.5 0 001.5 1.5h7A1.5 1.5 0 0013 13V6L8.5 1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M8.5 1.5V6H13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Add from local files
                </button>
              </div>
            )}
          </div>

          {/* Mode chip */}
          <div className="relative" ref={modeMenuRef}>
            <button
              type="button"
              onClick={() => setModeMenuOpen((v) => !v)}
              className={cn(
                "inline-flex items-center gap-1 rounded-[var(--radius-full)] border px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
                mode === "fast"
                  ? "border-teal-300/50 bg-teal-50 text-teal-700 hover:bg-teal-100/80 dark:border-teal-700/50 dark:bg-teal-950/30 dark:text-teal-400 dark:hover:bg-teal-950/50"
                  : "border-border bg-card text-foreground hover:bg-accent"
              )}
            >
              {mode === "fast" ? (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0">
                  <path d="M6.5 1L3 7h3l-.5 4L9 5H6l.5-4z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0">
                  <path d="M6 1l1.1 2.5L10 4l-2 2 .5 3L6 7.5 3.5 9l.5-3-2-2 2.9-.5L6 1z" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {mode === "fast" ? "Fast" : "Detailed"}
            </button>

            {modeMenuOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-56 rounded-[var(--radius-md)] border border-border bg-card shadow-lg py-1 z-10">
                <button
                  type="button"
                  onClick={() => handleModeChange("detailed")}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-accent transition-colors cursor-pointer"
                >
                  <svg width="14" height="14" viewBox="0 0 12 12" fill="none" className="shrink-0 text-muted-foreground">
                    <path d="M6 1l1.1 2.5L10 4l-2 2 .5 3L6 7.5 3.5 9l.5-3-2-2 2.9-.5L6 1z" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">Detailed mode</div>
                    <div className="text-xs text-muted">~3 minutes, highest quality</div>
                  </div>
                  {mode === "detailed" && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 text-primary">
                      <path d="M3 7l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange("fast")}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-accent transition-colors cursor-pointer"
                >
                  <svg width="14" height="14" viewBox="0 0 12 12" fill="none" className="shrink-0 text-muted-foreground">
                    <path d="M6.5 1L3 7h3l-.5 4L9 5H6l.5-4z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">Fast mode</div>
                    <div className="text-xs text-muted">~1 minute, good quality</div>
                  </div>
                  {mode === "fast" && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 text-primary">
                      <path d="M3 7l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Skill chips when active */}
          {skillActive && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onSkillDeactivate}
                className="group inline-flex items-center gap-1 rounded-[var(--radius-full)] border border-primary/30 bg-primary-light px-2.5 py-1 text-xs font-medium text-primary cursor-pointer transition-colors hover:bg-primary/10"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0 group-hover:hidden">
                  <rect x="1" y="2" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M1 4.5h10" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M4 6.5h4M4 8h2.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                </svg>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0 hidden group-hover:block">
                  <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                Infographic
              </button>
              <button
                type="button"
                onClick={onSkillDeactivate}
                className="group inline-flex items-center gap-1 rounded-[var(--radius-full)] border border-amber-300/50 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 cursor-pointer transition-colors hover:bg-amber-100/80"
              >
                <span className="group-hover:hidden">🍌</span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0 hidden group-hover:block">
                  <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                Nano Banana Pro
              </button>
            </div>
          )}

          {/* Style chip from "Create Similar" */}
          {styleChip && (
            <button
              type="button"
              onClick={onStyleChipRemove}
              className="group inline-flex items-center gap-1 rounded-[var(--radius-full)] border border-violet-300/50 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 cursor-pointer transition-colors hover:bg-violet-100/80"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0 group-hover:hidden">
                <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2" />
                <path d="M4 6h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                <path d="M6 4v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0 hidden group-hover:block">
                <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              {styleChip.name}
            </button>
          )}

          <div className="flex-1" />

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
