"use client";

import { useUIStore, View } from "@/lib/stores/ui-store";
import { useGenerationStore } from "@/lib/stores/generation-store";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const { sidebarOpen, toggleSidebar, currentView, setView } = useUIStore();
  const { openWizard } = useGenerationStore();

  const navigate = (view: View) => {
    setView(view);
    if (window.innerWidth < 1024) toggleSidebar();
  };

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-full w-64 border-r border-border bg-card transition-transform duration-200",
          "lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex items-center gap-2 border-b border-border px-4 py-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] bg-foreground">
              <span className="text-sm font-bold text-background">S</span>
            </div>
            <span className="text-lg font-semibold">Sumi</span>
          </div>

          {/* Actions */}
          <div className="p-3">
            <button
              onClick={() => {
                openWizard();
                if (window.innerWidth < 1024) toggleSidebar();
              }}
              className="flex w-full items-center gap-2 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium hover:bg-accent transition-colors cursor-pointer"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
                <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              New Infographic
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto px-3 py-2">
            <div className="mb-2 px-3 text-xs font-medium text-muted uppercase tracking-wider">
              Library
            </div>
            <div className="space-y-0.5">
              <SidebarLink icon="grid" label="All Generations" active={currentView === "home"} onClick={() => navigate("home")} />
              <SidebarLink icon="palette" label="Style Catalog" active={currentView === "catalog"} onClick={() => navigate("catalog")} />
            </div>
          </nav>

          {/* Footer */}
          <div className="border-t border-border px-4 py-3">
            <p className="text-xs text-muted">
              Sumi v0.1.0
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}

function SidebarLink({
  icon,
  label,
  active,
  onClick,
}: {
  icon: string;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-sm transition-colors cursor-pointer",
        active
          ? "bg-accent font-medium text-foreground"
          : "text-muted hover:bg-accent hover:text-foreground"
      )}
    >
      {icon === "grid" && (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
          <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
          <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
          <rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      )}
      {icon === "palette" && (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="6" cy="6" r="1" fill="currentColor" />
          <circle cx="10" cy="6" r="1" fill="currentColor" />
          <circle cx="6" cy="10" r="1" fill="currentColor" />
        </svg>
      )}
      {label}
    </button>
  );
}
