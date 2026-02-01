"use client";

import { cn } from "@/lib/utils";

interface ChipProps {
  children: React.ReactNode;
  variant?: "default" | "primary" | "outline";
  size?: "sm" | "md";
  onClick?: () => void;
  active?: boolean;
  className?: string;
}

const variantClasses = {
  default: "bg-accent text-foreground hover:bg-border",
  primary: "bg-primary text-white hover:bg-primary-hover",
  outline: "border border-border text-foreground hover:bg-accent",
};

export function Chip({
  children,
  variant = "default",
  size = "md",
  onClick,
  active,
  className,
}: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[var(--radius-full)] font-medium transition-colors cursor-pointer",
        size === "sm" ? "h-7 px-3 text-xs" : "h-9 px-4 text-sm",
        active
          ? "bg-primary text-white"
          : variantClasses[variant],
        className
      )}
    >
      {children}
    </button>
  );
}
