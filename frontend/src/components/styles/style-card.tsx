"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Style } from "@/types/style";
import { categoryMap } from "@/data/categories";

interface StyleCardProps {
  style: Style;
  selected?: boolean;
  onClick?: () => void;
  compact?: boolean;
}

export function StyleCard({ style, selected, onClick, compact }: StyleCardProps) {
  const category = categoryMap[style.category];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative w-full text-left rounded-[var(--radius-lg)] border bg-card p-3 transition-all cursor-pointer",
        "hover:shadow-md hover:border-primary/30",
        selected
          ? "border-primary ring-2 ring-primary/20"
          : "border-border"
      )}
    >
      {/* Thumbnail */}
      <div
        className={cn(
          "mb-3 overflow-hidden rounded-[var(--radius-md)] bg-accent",
          compact ? "aspect-square" : "aspect-[4/3]"
        )}
      >
        <img
          src={`/styles/${style.id}.png`}
          alt={style.name}
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = "none";
          }}
        />
        {/* Fallback color palette */}
        <div className="flex h-full w-full">
          {style.color_palette.slice(0, 4).map((color, i) => (
            <div key={i} className="flex-1" style={{ backgroundColor: color }} />
          ))}
        </div>
      </div>

      {/* Info */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h4 className="text-sm font-medium truncate">{style.name}</h4>
          <div className="flex shrink-0">
            {Array.from({ length: style.rating }).map((_, i) => (
              <svg key={i} width="10" height="10" viewBox="0 0 10 10" fill="currentColor" className="text-amber-400">
                <path d="M5 0l1.5 3 3.5.5-2.5 2.5.5 3.5L5 7.5 2 9.5l.5-3.5L0 3.5 3.5 3z" />
              </svg>
            ))}
          </div>
        </div>

        {!compact && (
          <p className="text-xs text-muted line-clamp-2 mb-2">{style.description}</p>
        )}

        <div className="flex flex-wrap gap-1">
          {category && (
            <Badge color={category.color}>{category.name}</Badge>
          )}
          {style.mood.slice(0, 2).map((m) => (
            <Badge key={m} className="bg-accent text-muted">{m}</Badge>
          ))}
        </div>
      </div>

      {/* Selected check */}
      {selected && (
        <div className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
    </button>
  );
}
