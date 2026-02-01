"use client";

import { useUIStore } from "@/lib/stores/ui-store";

export function TopBar() {
  const { toggleSidebar } = useUIStore();

  return (
    <header className="flex items-center gap-3 border-b border-border bg-card/80 backdrop-blur-sm px-4 py-3 lg:hidden">
      <button
        onClick={toggleSidebar}
        className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] hover:bg-accent transition-colors cursor-pointer"
        aria-label="Toggle sidebar"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      <span className="font-semibold">Sumi</span>
    </header>
  );
}
