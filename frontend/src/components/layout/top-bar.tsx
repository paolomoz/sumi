"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useUIStore } from "@/lib/stores/ui-store";
import { useState, useRef, useEffect } from "react";

export function TopBar() {
  const { toggleSidebar } = useUIStore();
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [menuOpen]);

  return (
    <header className="flex items-center gap-3 border-b border-border bg-card/80 backdrop-blur-sm px-4 py-3">
      {/* Mobile hamburger */}
      <button
        onClick={toggleSidebar}
        className="flex lg:hidden h-9 w-9 items-center justify-center rounded-[var(--radius-md)] hover:bg-accent transition-colors cursor-pointer"
        aria-label="Toggle sidebar"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {/* Logo - mobile only (desktop has sidebar) */}
      <span className="font-semibold lg:hidden">Sumi</span>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Auth section */}
      {status === "loading" ? (
        <div className="h-9 w-20 animate-pulse bg-muted rounded-[var(--radius-md)]" />
      ) : session ? (
        // Logged in: show user avatar with dropdown
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 rounded-[var(--radius-full)] hover:bg-accent transition-colors cursor-pointer p-1"
          >
            {session.user.image ? (
              <img
                src={session.user.image}
                alt=""
                width={32}
                height={32}
                referrerPolicy="no-referrer"
                className="h-8 w-8 rounded-full"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                {session.user.name?.[0] || "U"}
              </div>
            )}
          </button>

          {/* Dropdown menu */}
          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 rounded-[var(--radius-lg)] border border-border bg-card shadow-lg py-2 z-50">
              {/* User info */}
              <div className="px-4 py-3 border-b border-border">
                <div className="flex items-center gap-3">
                  {session.user.image ? (
                    <img
                      src={session.user.image}
                      alt=""
                      width={40}
                      height={40}
                      referrerPolicy="no-referrer"
                      className="h-10 w-10 rounded-full"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-lg font-medium">
                      {session.user.name?.[0] || "U"}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{session.user.name}</p>
                    <p className="text-xs text-muted truncate">{session.user.email}</p>
                  </div>
                </div>
              </div>

              {/* Menu items */}
              <div className="py-1">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    signOut();
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-500 hover:bg-accent transition-colors cursor-pointer"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M6 14H3.333A1.333 1.333 0 0 1 2 12.667V3.333A1.333 1.333 0 0 1 3.333 2H6M10.667 11.333 14 8l-3.333-3.333M14 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        // Logged out: show Sign in / Sign up buttons
        <div className="flex items-center gap-2">
          <button
            onClick={() => signIn()}
            className="px-4 py-2 text-sm font-medium rounded-[var(--radius-md)] bg-foreground text-background hover:bg-foreground/90 transition-colors cursor-pointer"
          >
            Sign in
          </button>
          <button
            onClick={() => signIn()}
            className="px-4 py-2 text-sm font-medium rounded-[var(--radius-md)] border border-border hover:bg-accent transition-colors cursor-pointer"
          >
            Sign up
          </button>
        </div>
      )}
    </header>
  );
}
