"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  useMonitorStats,
  useMonitorLeaderboard,
  useMonitorStyles,
  useMonitorGenerations,
  useMonitorMultiStyle,
  useMonitorFeedback,
} from "@/lib/hooks/use-monitor";

// ── Helpers ──────────────────────────────────────────────────

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function truncate(s: string, max: number) {
  return s.length > max ? s.slice(0, max) + "…" : s;
}

const CATEGORY_COLORS: Record<string, string> = {
  bug: "#ef4444",
  feature: "#3b82f6",
  improvement: "#8b5cf6",
  question: "#f59e0b",
  praise: "#22c55e",
  uncategorized: "#6b7280",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  analyzing: "#3b82f6",
  processing: "#8b5cf6",
  completed: "#22c55e",
  failed: "#ef4444",
};

// ── Volume Stats ─────────────────────────────────────────────

function VolumeCards({ monitorKey }: { monitorKey: string }) {
  const { data, isLoading } = useMonitorStats(monitorKey);

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="py-6">
              <div className="h-8 bg-muted rounded w-12 mx-auto" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    { label: "Last hour", value: data.last_hour, border: "#3b82f6" },
    { label: "Last 24h", value: data.last_day, border: "#8b5cf6" },
    { label: "Last 7 days", value: data.last_7_days, border: "#f59e0b" },
    { label: "Last 30 days", value: data.last_30_days, border: "#22c55e" },
  ];

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((c) => (
          <Card key={c.label} style={{ borderTopColor: c.border, borderTopWidth: 3 }}>
            <CardContent className="pt-4 text-center">
              <div className="text-3xl font-bold tabular-nums">{c.value}</div>
              <div className="text-sm text-muted mt-1">{c.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted text-right">{data.total} total generations</p>
    </div>
  );
}

// ── Leaderboard ──────────────────────────────────────────────

function Leaderboard({ monitorKey }: { monitorKey: string }) {
  const { data, isLoading } = useMonitorLeaderboard(monitorKey);

  if (isLoading || !data) return <TableSkeleton rows={5} />;
  if (data.length === 0) return <EmptyState text="No users yet" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Users</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="py-2 pr-3 w-10">#</th>
                <th className="py-2 pr-3">User</th>
                <th className="py-2 pr-3 text-right">Count</th>
                <th className="py-2 text-right">Last Active</th>
              </tr>
            </thead>
            <tbody>
              {data.map((u, i) => (
                <tr key={u.user_id} className="border-b border-border/50">
                  <td className="py-2 pr-3 text-muted">{i + 1}</td>
                  <td className="py-2 pr-3 font-mono text-xs">
                    {truncate(u.user_id, 20)}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums font-medium">
                    {u.generation_count}
                  </td>
                  <td className="py-2 text-right text-muted text-xs">
                    {formatTime(u.last_active)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Style Breakdown ──────────────────────────────────────────

function StyleBreakdown({ monitorKey }: { monitorKey: string }) {
  const { data, isLoading } = useMonitorStyles(monitorKey);

  if (isLoading || !data) return <TableSkeleton rows={4} />;
  if (data.length === 0) return <EmptyState text="No style data" />;

  const max = data[0]?.count ?? 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Styles</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {data.map((s) => (
          <div key={s.style_id} className="flex items-center gap-3">
            <span className="text-sm w-32 shrink-0 truncate" title={s.style_name}>
              {s.style_name}
            </span>
            <div className="flex-1 h-5 bg-muted/30 rounded overflow-hidden">
              <div
                className="h-full bg-foreground/15 rounded"
                style={{ width: `${(s.count / max) * 100}%` }}
              />
            </div>
            <span className="text-xs text-muted tabular-nums w-8 text-right">
              {s.count}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ── Multi-Style Experiments ──────────────────────────────────

function MultiStyleExperiments({ monitorKey }: { monitorKey: string }) {
  const { data, isLoading } = useMonitorMultiStyle(monitorKey);

  if (isLoading || !data) return <TableSkeleton rows={3} />;
  if (data.length === 0) return <EmptyState text="No multi-style experiments" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Multi-Style Experiments</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.map((m, i) => (
          <div
            key={i}
            className="p-3 rounded-[var(--radius)] border border-border/50 space-y-1.5"
          >
            <div className="text-sm font-medium">{truncate(m.topic, 80)}</div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted font-mono">
                {truncate(m.user_id, 16)}
              </span>
              {m.styles.split(",").map((s) => (
                <Badge key={s} color="#8b5cf6">
                  {s.trim()}
                </Badge>
              ))}
            </div>
            <div className="text-xs text-muted">
              {formatTime(m.first_created)} — {formatTime(m.last_created)}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ── Generations Tab ──────────────────────────────────────────

function GenerationsTable({ monitorKey }: { monitorKey: string }) {
  const [page, setPage] = useState(0);
  const limit = 50;
  const { data, isLoading } = useMonitorGenerations(monitorKey, limit, page * limit);

  if (isLoading || !data) return <TableSkeleton rows={10} />;

  const total = data.total;
  const from = page * limit + 1;
  const to = Math.min((page + 1) * limit, total);

  return (
    <Card>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="py-2 pr-3">Time</th>
                <th className="py-2 pr-3">User</th>
                <th className="py-2 pr-3">Topic</th>
                <th className="py-2 pr-3">Style</th>
                <th className="py-2 pr-3">Layout</th>
                <th className="py-2">AR</th>
              </tr>
            </thead>
            <tbody>
              {data.generations.map((g) => (
                <tr key={g.id} className="border-b border-border/50">
                  <td className="py-2 pr-3 text-xs text-muted whitespace-nowrap">
                    {formatTime(g.created_at)}
                  </td>
                  <td className="py-2 pr-3 font-mono text-xs">
                    {truncate(g.user_id, 16)}
                  </td>
                  <td className="py-2 pr-3 max-w-xs truncate" title={g.topic}>
                    {truncate(g.topic, 60)}
                  </td>
                  <td className="py-2 pr-3 text-xs">{g.style_name ?? "—"}</td>
                  <td className="py-2 pr-3 text-xs">{g.layout_name ?? "—"}</td>
                  <td className="py-2 text-xs">{g.aspect_ratio}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between mt-3 text-sm">
          <span className="text-muted">
            Showing {from}–{to} of {total}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1 rounded border border-border text-sm disabled:opacity-30 hover:bg-accent cursor-pointer disabled:cursor-default"
            >
              Prev
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={to >= total}
              className="px-3 py-1 rounded border border-border text-sm disabled:opacity-30 hover:bg-accent cursor-pointer disabled:cursor-default"
            >
              Next
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Feedback Tab ─────────────────────────────────────────────

function FeedbackSummary({ monitorKey }: { monitorKey: string }) {
  const { data } = useMonitorFeedback(monitorKey, 1, 0);
  if (!data) return null;

  return (
    <div className="flex flex-wrap gap-4 mb-4">
      <Card className="flex-1 min-w-[180px]">
        <CardHeader>
          <CardTitle className="text-sm">By Category</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-1.5">
          {Object.entries(data.by_category).map(([cat, count]) => (
            <Badge key={cat} color={CATEGORY_COLORS[cat] ?? "#6b7280"}>
              {cat} ({count})
            </Badge>
          ))}
          {Object.keys(data.by_category).length === 0 && (
            <span className="text-xs text-muted">No feedback yet</span>
          )}
        </CardContent>
      </Card>
      <Card className="flex-1 min-w-[180px]">
        <CardHeader>
          <CardTitle className="text-sm">By Status</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-1.5">
          {Object.entries(data.by_status).map(([status, count]) => (
            <Badge key={status} color={STATUS_COLORS[status] ?? "#6b7280"}>
              {status} ({count})
            </Badge>
          ))}
          {Object.keys(data.by_status).length === 0 && (
            <span className="text-xs text-muted">No feedback yet</span>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FeedbackTable({ monitorKey }: { monitorKey: string }) {
  const [page, setPage] = useState(0);
  const limit = 50;
  const { data, isLoading } = useMonitorFeedback(monitorKey, limit, page * limit);

  if (isLoading || !data) return <TableSkeleton rows={8} />;

  const total = data.total;
  const from = total > 0 ? page * limit + 1 : 0;
  const to = Math.min((page + 1) * limit, total);

  return (
    <Card>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="py-2 pr-3">Time</th>
                <th className="py-2 pr-3">User</th>
                <th className="py-2 pr-3">Content</th>
                <th className="py-2 pr-3">Category</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2">PR</th>
              </tr>
            </thead>
            <tbody>
              {data.feedback.map((f) => (
                <tr key={f.id} className="border-b border-border/50">
                  <td className="py-2 pr-3 text-xs text-muted whitespace-nowrap">
                    {formatTime(f.created_at)}
                  </td>
                  <td className="py-2 pr-3 font-mono text-xs">
                    {f.user_id ? truncate(f.user_id, 16) : "—"}
                  </td>
                  <td className="py-2 pr-3 max-w-sm truncate" title={f.content}>
                    {truncate(f.content, 80)}
                  </td>
                  <td className="py-2 pr-3">
                    {f.category ? (
                      <Badge color={CATEGORY_COLORS[f.category] ?? "#6b7280"}>
                        {f.category}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    <Badge color={STATUS_COLORS[f.status] ?? "#6b7280"}>
                      {f.status}
                    </Badge>
                  </td>
                  <td className="py-2 text-xs">
                    {f.pr_url ? (
                      <a
                        href={f.pr_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline"
                      >
                        View
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
              {data.feedback.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted">
                    No feedback yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {total > 0 && (
          <div className="flex items-center justify-between mt-3 text-sm">
            <span className="text-muted">
              Showing {from}–{to} of {total}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1 rounded border border-border text-sm disabled:opacity-30 hover:bg-accent cursor-pointer disabled:cursor-default"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={to >= total}
                className="px-3 py-1 rounded border border-border text-sm disabled:opacity-30 hover:bg-accent cursor-pointer disabled:cursor-default"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Shared Components ────────────────────────────────────────

function TableSkeleton({ rows }: { rows: number }) {
  return (
    <Card className="animate-pulse">
      <CardContent className="space-y-3 py-6">
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="h-4 bg-muted/30 rounded w-full" />
        ))}
      </CardContent>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <Card>
      <CardContent className="py-8 text-center text-muted text-sm">{text}</CardContent>
    </Card>
  );
}

// ── Main Page ────────────────────────────────────────────────

function MonitorDashboard() {
  const searchParams = useSearchParams();
  const monitorKey = searchParams.get("key") ?? "";

  const { error } = useMonitorStats(monitorKey);

  if (!monitorKey) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-sm w-full text-center">
          <CardContent className="py-8">
            <p className="text-lg font-medium mb-2">Access denied</p>
            <p className="text-sm text-muted">
              A valid monitor key is required. Add <code className="text-xs bg-muted/30 px-1 py-0.5 rounded">?key=...</code> to the URL.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && (error as Error & { status?: number }).status === 403) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-sm w-full text-center">
          <CardContent className="py-8">
            <p className="text-lg font-medium mb-2">Access denied</p>
            <p className="text-sm text-muted">Invalid monitor key.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold">Monitor</h1>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="generations">Generations</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <VolumeCards monitorKey={monitorKey} />
          <div className="grid md:grid-cols-2 gap-6">
            <Leaderboard monitorKey={monitorKey} />
            <StyleBreakdown monitorKey={monitorKey} />
          </div>
          <MultiStyleExperiments monitorKey={monitorKey} />
        </TabsContent>

        <TabsContent value="generations">
          <GenerationsTable monitorKey={monitorKey} />
        </TabsContent>

        <TabsContent value="feedback" className="space-y-4">
          <FeedbackSummary monitorKey={monitorKey} />
          <FeedbackTable monitorKey={monitorKey} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function MonitorPage() {
  return (
    <Suspense>
      <MonitorDashboard />
    </Suspense>
  );
}
