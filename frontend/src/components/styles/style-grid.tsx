"use client";

import { Style } from "@/types/style";
import { StyleCard } from "./style-card";

interface StyleGridProps {
  styles: Style[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  compact?: boolean;
}

export function StyleGrid({ styles, selectedId, onSelect, compact }: StyleGridProps) {
  if (styles.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted">
        No styles found matching your criteria.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {styles.map((style) => (
        <StyleCard
          key={style.id}
          style={style}
          selected={selectedId === style.id}
          onClick={() => onSelect?.(style.id)}
          compact={compact}
        />
      ))}
    </div>
  );
}
