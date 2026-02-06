"use client";

import { useState, useEffect } from "react";
/* eslint-disable @next/next/no-img-element */

interface TagData {
  image: string;
  timings: Record<string, number>;
  total_time: number;
}

interface TopicComparison {
  name: string;
  before?: TagData;
  after?: TagData;
}

interface ComparisonPhase {
  phase: string;
  label: string;
  topics: TopicComparison[];
}

const TIMING_COLORS: Record<string, string> = {
  pre_synthesis: "#6366f1",
  analysis: "#4ecdc4",
  structuring: "#45b7d1",
  crafting: "#bb8fce",
  image_generation: "#e74c3c",
};

const TIMING_LABELS: Record<string, string> = {
  pre_synthesis: "Pre-synthesis",
  analysis: "Analysis",
  structuring: "Structuring",
  crafting: "Crafting",
  image_generation: "Image Gen",
};

function TimingBar({ timings, maxTime }: { timings: Record<string, number>; maxTime: number }) {
  const steps = Object.entries(timings).filter(([k]) => k !== "total");
  return (
    <div className="flex h-6 rounded overflow-hidden bg-muted/30 w-full">
      {steps.map(([key, value]) => {
        const pct = maxTime > 0 ? (value / maxTime) * 100 : 0;
        if (pct < 0.5) return null;
        return (
          <div
            key={key}
            className="flex items-center justify-center text-[9px] font-medium text-white truncate"
            style={{
              width: `${pct}%`,
              backgroundColor: TIMING_COLORS[key] || "#888",
              minWidth: pct > 3 ? undefined : "2px",
            }}
            title={`${TIMING_LABELS[key] || key}: ${value.toFixed(1)}s`}
          >
            {pct > 8 ? `${value.toFixed(1)}s` : ""}
          </div>
        );
      })}
    </div>
  );
}

function TimeDelta({ before, after }: { before?: number; after?: number }) {
  if (before == null || after == null) return null;
  const delta = after - before;
  const pct = before > 0 ? ((delta / before) * 100).toFixed(0) : "N/A";
  const isImproved = delta < 0;
  return (
    <span
      className={`text-xs font-medium ${
        isImproved ? "text-green-500" : delta > 0 ? "text-red-500" : "text-muted-foreground"
      }`}
    >
      {isImproved ? "" : "+"}
      {delta.toFixed(1)}s ({isImproved ? "" : "+"}
      {pct}%)
    </span>
  );
}

export default function PipelineComparisonPage() {
  const [phases, setPhases] = useState<ComparisonPhase[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/output/pipeline-comparison/manifest.json?_=${Date.now()}`)
      .then((res) => res.json())
      .then((data) => {
        setPhases(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading comparison data...</p>
        </div>
      </div>
    );
  }

  if (phases.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-lg">
          <h1 className="text-2xl font-semibold mb-4">No Comparison Data Yet</h1>
          <p className="text-muted-foreground mb-4">
            Run the benchmark script to generate before/after data:
          </p>
          <code className="block bg-muted p-4 rounded-lg text-sm text-left whitespace-pre-wrap">
            {`cd backend && source .venv/bin/activate

# Capture baseline (before changes)
python -m scripts.benchmark_pipeline_phase \\
  --phase phase-1 \\
  --label "Remove Recommendations" \\
  --tag before

# ... implement changes ...

# Capture results (after changes)
python -m scripts.benchmark_pipeline_phase \\
  --phase phase-1 \\
  --label "Remove Recommendations" \\
  --tag after`}
          </code>
        </div>
      </div>
    );
  }

  // Compute max time across all data for consistent bar scaling
  const allTimes = phases.flatMap((p) =>
    p.topics.flatMap((t) => [t.before?.total_time, t.after?.total_time].filter(Boolean) as number[])
  );
  const maxTime = Math.max(...allTimes, 1);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold text-foreground mb-2">
            Pipeline Speed Comparison
          </h1>
          <p className="text-muted-foreground">
            Before/after timing and quality comparison for each optimization phase
          </p>
        </header>

        {/* Timing legend */}
        <div className="flex flex-wrap gap-4 mb-8 p-4 bg-muted/50 rounded-lg">
          {Object.entries(TIMING_LABELS).map(([key, label]) => (
            <div key={key} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: TIMING_COLORS[key] }}
              />
              <span className="text-sm">{label}</span>
            </div>
          ))}
        </div>

        {/* Phases */}
        <div className="space-y-12">
          {phases.map((phase) => (
            <div key={phase.phase} className="border border-border rounded-xl overflow-hidden">
              {/* Phase header */}
              <div className="bg-muted/50 p-4 border-b border-border">
                <h2 className="text-lg font-medium text-foreground">
                  {phase.label}
                </h2>
                <p className="text-sm text-muted-foreground">{phase.phase}</p>
              </div>

              {/* Topics */}
              <div className="divide-y divide-border">
                {phase.topics.map((topic) => (
                  <div key={topic.name} className="p-4">
                    {/* Topic name + delta */}
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-medium">{topic.name}</h3>
                      <TimeDelta
                        before={topic.before?.total_time}
                        after={topic.after?.total_time}
                      />
                    </div>

                    {/* Before/After columns */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Before */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Before
                          </span>
                          {topic.before && (
                            <span className="text-xs tabular-nums text-muted-foreground">
                              {topic.before.total_time.toFixed(1)}s
                            </span>
                          )}
                        </div>
                        {topic.before ? (
                          <>
                            <TimingBar timings={topic.before.timings} maxTime={maxTime} />
                            <button
                              onClick={() => setLightboxImg(topic.before!.image)}
                              className="mt-2 w-full aspect-[16/9] relative overflow-hidden bg-muted rounded-lg cursor-pointer group"
                            >
                              <img
                                src={topic.before.image}
                                alt={`${topic.name} - Before`}
                                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            </button>
                          </>
                        ) : (
                          <div className="w-full aspect-[16/9] bg-muted rounded-lg flex items-center justify-center">
                            <span className="text-sm text-muted-foreground">Not yet run</span>
                          </div>
                        )}
                      </div>

                      {/* After */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            After
                          </span>
                          {topic.after && (
                            <span className="text-xs tabular-nums text-muted-foreground">
                              {topic.after.total_time.toFixed(1)}s
                            </span>
                          )}
                        </div>
                        {topic.after ? (
                          <>
                            <TimingBar timings={topic.after.timings} maxTime={maxTime} />
                            <button
                              onClick={() => setLightboxImg(topic.after!.image)}
                              className="mt-2 w-full aspect-[16/9] relative overflow-hidden bg-muted rounded-lg cursor-pointer group"
                            >
                              <img
                                src={topic.after.image}
                                alt={`${topic.name} - After`}
                                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            </button>
                          </>
                        ) : (
                          <div className="w-full aspect-[16/9] bg-muted rounded-lg flex items-center justify-center">
                            <span className="text-sm text-muted-foreground">Not yet run</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Per-step timing comparison table */}
                    {topic.before && topic.after && (
                      <div className="mt-4 overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-muted-foreground">
                              <th className="text-left py-1 pr-4 font-medium">Step</th>
                              <th className="text-right py-1 px-2 font-medium">Before</th>
                              <th className="text-right py-1 px-2 font-medium">After</th>
                              <th className="text-right py-1 pl-2 font-medium">Delta</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.keys(topic.before.timings)
                              .filter((k) => k !== "total")
                              .map((step) => {
                                const b = topic.before!.timings[step] ?? 0;
                                const a = topic.after!.timings[step] ?? 0;
                                const d = a - b;
                                return (
                                  <tr key={step} className="border-t border-border/50">
                                    <td className="py-1 pr-4">
                                      <span className="flex items-center gap-1.5">
                                        <span
                                          className="w-2 h-2 rounded-full inline-block"
                                          style={{ backgroundColor: TIMING_COLORS[step] || "#888" }}
                                        />
                                        {TIMING_LABELS[step] || step}
                                      </span>
                                    </td>
                                    <td className="text-right py-1 px-2 tabular-nums">{b.toFixed(1)}s</td>
                                    <td className="text-right py-1 px-2 tabular-nums">{a.toFixed(1)}s</td>
                                    <td
                                      className={`text-right py-1 pl-2 tabular-nums ${
                                        d < 0 ? "text-green-500" : d > 0 ? "text-red-500" : ""
                                      }`}
                                    >
                                      {d < 0 ? "" : "+"}
                                      {d.toFixed(1)}s
                                    </td>
                                  </tr>
                                );
                              })}
                            <tr className="border-t border-border font-medium">
                              <td className="py-1 pr-4">Total</td>
                              <td className="text-right py-1 px-2 tabular-nums">
                                {topic.before.total_time.toFixed(1)}s
                              </td>
                              <td className="text-right py-1 px-2 tabular-nums">
                                {topic.after.total_time.toFixed(1)}s
                              </td>
                              <td className="text-right py-1 pl-2">
                                <TimeDelta
                                  before={topic.before.total_time}
                                  after={topic.after.total_time}
                                />
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Lightbox */}
        {lightboxImg && (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setLightboxImg(null)}
          >
            <div className="relative max-w-5xl max-h-[90vh] w-full">
              <button
                className="absolute top-4 right-4 z-10 p-2 bg-black/50 text-white rounded-full backdrop-blur hover:bg-black/70"
                onClick={() => setLightboxImg(null)}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
              <img
                src={lightboxImg}
                alt="Comparison image"
                className="w-full h-auto max-h-[90vh] object-contain rounded-lg"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
