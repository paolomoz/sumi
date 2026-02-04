"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useHistory } from "@/lib/hooks/use-history";
import { cn } from "@/lib/utils";

export function GenerationHistory() {
  const { data: session } = useSession();
  const { data: generations } = useHistory();
  const pathname = usePathname();

  if (!session || !generations || generations.length === 0) {
    return null;
  }

  return (
    <div className="px-3 py-2">
      <div className="mb-2 px-3 text-xs font-medium text-muted uppercase tracking-wider">
        Recent
      </div>
      <div className="space-y-0.5">
        {generations.slice(0, 20).map((gen) => {
          const href = `/task/${gen.id}`;
          const isActive = pathname === href;

          return (
            <Link
              key={gen.id}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-accent text-foreground"
                  : "text-muted hover:bg-accent hover:text-foreground"
              )}
            >
              {gen.image_url ? (
                <img
                  src={gen.image_url}
                  alt=""
                  width={28}
                  height={28}
                  className="h-7 w-7 rounded object-cover shrink-0"
                />
              ) : (
                <div className="h-7 w-7 rounded bg-accent shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{gen.topic}</p>
                <p className="truncate text-xs text-muted">
                  {gen.style_name || gen.style_id || ""}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
