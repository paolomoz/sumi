"use client";

import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number; // 0 to 1
  className?: string;
  label?: string;
}

export function ProgressBar({ value, className, label }: ProgressBarProps) {
  const percent = Math.round(value * 100);
  return (
    <div className={cn("w-full", className)}>
      {label && (
        <div className="flex justify-between mb-1.5">
          <span className="text-sm text-muted">{label}</span>
          <span className="text-sm font-medium">{percent}%</span>
        </div>
      )}
      <div className="h-2 w-full rounded-[var(--radius-full)] bg-accent overflow-hidden">
        <div
          className="h-full rounded-[var(--radius-full)] bg-primary transition-all duration-500 ease-out"
          style={{ width: `${percent}%` }}
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}
