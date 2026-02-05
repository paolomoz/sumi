"use client";

import { useRouter, usePathname } from "next/navigation";
import { useUIStore } from "@/lib/stores/ui-store";
import { cn } from "@/lib/utils";
import { GenerationHistory } from "@/components/layout/generation-history";
import { UserMenu } from "@/components/layout/user-menu";

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useUIStore();

  const navigate = (path: string) => {
    router.push(path);
    if (window.innerWidth < 1024) toggleSidebar();
  };

  return (
    <>
      {/* Mobile overlay - darker for better visibility */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={toggleSidebar}
          aria-label="Close sidebar"
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
          {/* Logo with close button on mobile */}
          <div className="flex items-center justify-between border-b border-border px-4 py-4">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
            >
              <img src="/icon-circle-dark.svg" alt="" width={32} height={32} className="h-8 w-8" />
              <span className="text-lg font-semibold">Sumi</span>
            </button>
            {/* Close button - only visible on mobile */}
            <button
              onClick={toggleSidebar}
              className="lg:hidden flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] hover:bg-accent transition-colors cursor-pointer"
              aria-label="Close sidebar"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Actions */}
          <div className="p-3">
            <button
              onClick={() => navigate("/")}
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
              <SidebarLink icon="grid" label="All Generations" active={pathname === "/"} onClick={() => navigate("/")} />
            </div>

            <GenerationHistory />
          </nav>

          {/* User */}
          <UserMenu />
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
