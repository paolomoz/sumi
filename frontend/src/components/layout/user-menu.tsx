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

  if (!session) {
    return (
      <div className="border-t border-border px-4 py-3 space-y-1.5">
        <p className="text-xs text-muted mb-2">Sign in to save history</p>
        <button
          onClick={() => signIn("google")}
          className="flex w-full items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-sm text-muted hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M14.537 6.545H14V6.5H8v3h3.768A3.998 3.998 0 0 1 4 8a4 4 0 0 1 4-4c1.018 0 1.947.384 2.654 1.014l2.122-2.122A6.966 6.966 0 0 0 8 1a7 7 0 1 0 6.537 5.545Z" fill="currentColor" opacity="0.6" />
          </svg>
          Google
        </button>
        <button
          onClick={() => signIn("github")}
          className="flex w-full items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-sm text-muted hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1a7 7 0 0 0-2.213 13.64c.35.064.478-.152.478-.337 0-.166-.006-.606-.01-1.19-1.947.423-2.357-.938-2.357-.938-.318-.808-.777-1.023-.777-1.023-.635-.434.048-.425.048-.425.702.05 1.072.72 1.072.72.624 1.07 1.637.76 2.036.582.063-.453.244-.761.444-.936-1.554-.177-3.188-.777-3.188-3.456 0-.764.273-1.388.72-1.877-.072-.177-.312-.888.069-1.851 0 0 .587-.188 1.922.717A6.69 6.69 0 0 1 8 4.381c.594.003 1.193.08 1.752.236 1.334-.905 1.92-.717 1.92-.717.382.963.142 1.674.07 1.85.448.49.72 1.114.72 1.878 0 2.686-1.636 3.276-3.195 3.45.251.216.475.643.475 1.296 0 .936-.009 1.69-.009 1.92 0 .187.127.405.481.336A7.001 7.001 0 0 0 8 1Z" fill="currentColor" opacity="0.6" />
          </svg>
          GitHub
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
