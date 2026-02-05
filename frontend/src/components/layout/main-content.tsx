"use client";

import { TopBar } from "./top-bar";

export function MainContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex flex-1 flex-col min-h-0">
      <TopBar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
