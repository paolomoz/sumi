"use client";

import { useSession, signIn, signOut } from "next-auth/react";

export function UserMenu() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="border-t border-border px-4 py-3">
        <p className="text-xs text-muted">Loading...</p>
      </div>
    );
  }

  // When not logged in, show a subtle prompt (main auth is in top bar)
  if (!session) {
    return (
      <div className="border-t border-border px-4 py-3">
        <button
          onClick={() => signIn()}
          className="flex w-full items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-sm text-muted hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.5" />
            <path d="M2 14c0-3 3-4.5 6-4.5s6 1.5 6 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Sign in
        </button>
      </div>
    );
  }

  return (
    <div className="border-t border-border px-4 py-3">
      <div className="flex items-center gap-2">
        {session.user.image && (
          <img
            src={session.user.image}
            alt=""
            width={24}
            height={24}
            referrerPolicy="no-referrer"
            className="h-6 w-6 rounded-full"
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm truncate">{session.user.name}</p>
        </div>
        <button
          onClick={() => signOut()}
          className="text-xs text-muted hover:text-foreground transition-colors cursor-pointer"
          title="Sign out"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 14H3.333A1.333 1.333 0 0 1 2 12.667V3.333A1.333 1.333 0 0 1 3.333 2H6M10.667 11.333 14 8l-3.333-3.333M14 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
