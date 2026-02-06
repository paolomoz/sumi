"use client";

import { useState, useEffect } from "react";
/* eslint-disable @next/next/no-img-element */

interface ProviderData {
  image: string;
  timings: Record<string, number>;
  total_time: number;
}

interface TopicComparison {
  name: string;
  opus?: ProviderData;
  cerebras?: ProviderData;
}

interface Manifest {
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

function SpeedupBadge({ opus, cerebras }: { opus?: number; cerebras?: number }) {
  if (opus == null || cerebras == null) return null;
  const speedup = opus / cerebras;
  const saved = opus - cerebras;
  return (
    <span className="text-xs font-medium text-green-500">
      {speedup.toFixed(1)}x faster ({saved.toFixed(0)}s saved)
    </span>
  );
}

export default function ModelQualityPage() {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/output/model-quality/manifest.json?_=${Date.now()}`)
      .then((res) => res.json())
      .then((data) => {
        setManifest(data);
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

  if (!manifest || manifest.topics.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-lg">
          <h1 className="text-2xl font-semibold mb-4">No Comparison Data Yet</h1>
          <p className="text-muted-foreground mb-4">
            Run the benchmark script for each provider:
          </p>
          <code className="block bg-muted p-4 rounded-lg text-sm text-left whitespace-pre-wrap">
            {`cd backend && source .venv/bin/activate

# Run full pipeline with Claude Opus
python -m scripts.benchmark_model_quality --provider opus

# Run full pipeline with Cerebras GPT-OSS
python -m scripts.benchmark_model_quality --provider cerebras`}
          </code>
        </div>
      </div>
    );
  }

  // Compute max time for consistent bar scaling
  const allTimes = manifest.topics.flatMap((t) =>
    [t.opus?.total_time, t.cerebras?.total_time].filter(Boolean) as number[]
  );
  const maxTime = Math.max(...allTimes, 1);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold text-foreground mb-2">
            Model Quality Comparison
          </h1>
          <p className="text-muted-foreground">
            Full Claude Opus pipeline vs full Cerebras GPT-OSS pipeline — same topics, same style, different LLMs
          </p>
        </header>

        {/* Legend */}
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

        {/* Topics */}
        <div className="space-y-12">
          {manifest.topics.map((topic) => (
            <div key={topic.name} className="border border-border rounded-xl overflow-hidden">
              {/* Topic header */}
              <div className="bg-muted/50 p-4 border-b border-border flex items-center justify-between">
                <h2 className="text-lg font-medium text-foreground">{topic.name}</h2>
                {topic.opus && topic.cerebras && (
                  <SpeedupBadge opus={topic.opus.total_time} cerebras={topic.cerebras.total_time} />
                )}
              </div>

              {/* Provider columns */}
              <div className="grid grid-cols-2 gap-0 divide-x divide-border">
                {/* Opus */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-orange-500" />
                      <span className="text-sm font-medium">Claude Opus</span>
                    </div>
                    {topic.opus && (
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {topic.opus.total_time.toFixed(1)}s
                      </span>
                    )}
                  </div>
                  {topic.opus ? (
                    <>
                      <TimingBar timings={topic.opus.timings} maxTime={maxTime} />
                      <button
                        onClick={() => setLightboxImg(topic.opus!.image)}
                        className="mt-3 w-full aspect-[16/9] relative overflow-hidden bg-muted rounded-lg cursor-pointer group"
                      >
                        <img
                          src={topic.opus.image}
                          alt={`${topic.name} - Opus`}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </button>
                    </>
                  ) : (
                    <div className="w-full aspect-[16/9] bg-muted rounded-lg flex items-center justify-center mt-3">
                      <span className="text-sm text-muted-foreground">Not yet run</span>
                    </div>
                  )}
                </div>

                {/* Cerebras */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-sm font-medium">Cerebras GPT-OSS</span>
                    </div>
                    {topic.cerebras && (
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {topic.cerebras.total_time.toFixed(1)}s
                      </span>
                    )}
                  </div>
                  {topic.cerebras ? (
                    <>
                      <TimingBar timings={topic.cerebras.timings} maxTime={maxTime} />
                      <button
                        onClick={() => setLightboxImg(topic.cerebras!.image)}
                        className="mt-3 w-full aspect-[16/9] relative overflow-hidden bg-muted rounded-lg cursor-pointer group"
                      >
                        <img
                          src={topic.cerebras.image}
                          alt={`${topic.name} - Cerebras`}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </button>
                    </>
                  ) : (
                    <div className="w-full aspect-[16/9] bg-muted rounded-lg flex items-center justify-center mt-3">
                      <span className="text-sm text-muted-foreground">Not yet run</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Per-step timing table */}
              {topic.opus && topic.cerebras && (
                <div className="px-4 pb-4">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-muted-foreground">
                        <th className="text-left py-1 pr-4 font-medium">Step</th>
                        <th className="text-right py-1 px-2 font-medium">Opus</th>
                        <th className="text-right py-1 px-2 font-medium">Cerebras</th>
                        <th className="text-right py-1 pl-2 font-medium">Speedup</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(topic.opus.timings)
                        .filter((k) => k !== "total")
                        .map((step) => {
                          const o = topic.opus!.timings[step] ?? 0;
                          const c = topic.cerebras!.timings[step] ?? 0;
                          const speedup = o > 0 && c > 0 ? o / c : 0;
                          const saved = o - c;
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
                              <td className="text-right py-1 px-2 tabular-nums">{o.toFixed(1)}s</td>
                              <td className="text-right py-1 px-2 tabular-nums">{c.toFixed(1)}s</td>
                              <td
                                className={`text-right py-1 pl-2 tabular-nums ${
                                  saved > 1 ? "text-green-500" : saved < -1 ? "text-red-500" : ""
                                }`}
                              >
                                {speedup > 0 ? `${speedup.toFixed(1)}x` : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      <tr className="border-t border-border font-medium">
                        <td className="py-1 pr-4">Total</td>
                        <td className="text-right py-1 px-2 tabular-nums">
                          {topic.opus.total_time.toFixed(1)}s
                        </td>
                        <td className="text-right py-1 px-2 tabular-nums">
                          {topic.cerebras.total_time.toFixed(1)}s
                        </td>
                        <td className="text-right py-1 pl-2">
                          <SpeedupBadge
                            opus={topic.opus.total_time}
                            cerebras={topic.cerebras.total_time}
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
