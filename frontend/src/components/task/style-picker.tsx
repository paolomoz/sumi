"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Style } from "@/types/style";

interface StylePickerProps {
  styles: Style[];
  defaultStyleId?: string;
  onSelect: (styleId: string) => void;
  onCancel?: () => void;
  confirmLabel?: string;
}

export function StylePicker({
  styles,
  defaultStyleId,
  onSelect,
  onCancel,
  confirmLabel = "Confirm",
}: StylePickerProps) {
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(
    defaultStyleId ?? null
  );

  return (
    <div className="space-y-3">
      {/* Style grid */}
      <div className="max-h-52 overflow-y-auto pr-1 -mr-1">
        <div className="grid grid-cols-3 gap-2">
          {styles.map((style) => {
            const isSelected = selectedStyleId === style.id;
            return (
              <button
                key={style.id}
                type="button"
                onClick={() => setSelectedStyleId(style.id)}
                className={cn(
                  "relative text-left rounded-[var(--radius-md)] border p-1.5 transition-all cursor-pointer",
                  "hover:border-primary/50 hover:shadow-sm",
                  isSelected
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-border"
                )}
              >
                <img
                  src={`/styles/${style.id}.jpg`}
                  alt={style.name}
                  className="w-full aspect-[4/3] rounded object-cover mb-1"
                />
                <p className="text-[10px] font-medium truncate leading-tight">
                  {style.name}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-medium border border-border hover:bg-accent transition-colors cursor-pointer"
          >
            Back
          </button>
        )}
        <button
          type="button"
          disabled={!selectedStyleId}
          onClick={() => {
            if (selectedStyleId) {
              onSelect(selectedStyleId);
            }
          }}
          className={cn(
            "px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-medium transition-colors cursor-pointer",
            "bg-primary text-primary-foreground hover:bg-primary/90",
            !selectedStyleId && "opacity-50 cursor-not-allowed"
          )}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}
