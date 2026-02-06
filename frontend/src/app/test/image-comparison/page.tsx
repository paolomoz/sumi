"use client";

import { useState, useEffect } from "react";
/* eslint-disable @next/next/no-img-element */

interface ProviderImage {
  image: string;
  time: number;
}

interface TopicComparison {
  name: string;
  llm_time: number;
  gemini: ProviderImage;
  recraft: ProviderImage;
}

interface Manifest {
  topics: TopicComparison[];
}

function SpeedupBadge({ a, b, label }: { a: number; b: number; label: string }) {
  if (a <= 0 || b <= 0) return null;
  const faster = Math.min(a, b);
  const slower = Math.max(a, b);
  const speedup = slower / faster;
  const winner = a < b ? label.split(" vs ")[0] : label.split(" vs ")[1];
  return (
    <span className="text-xs font-medium text-green-500">
      {winner} {speedup.toFixed(1)}x faster
    </span>
  );
}

export default function ImageComparisonPage() {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<{ src: string; label: string } | null>(null);

  useEffect(() => {
    fetch(`/output/image-comparison/manifest.json?_=${Date.now()}`)
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
            Run the benchmark script to generate comparison data:
          </p>
          <code className="block bg-muted p-4 rounded-lg text-sm text-left whitespace-pre-wrap">
            {`cd backend && source .venv/bin/activate

python -m scripts.benchmark_image_providers`}
          </code>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold text-foreground mb-2">
            Image Provider Comparison — Gemini 3 vs Recraft V3
          </h1>
          <p className="text-muted-foreground">
            Same prompt (Fast mode / Cerebras), different image generators
          </p>
        </header>

        {/* Topics */}
        <div className="space-y-10">
          {manifest.topics.map((topic) => (
            <div key={topic.name} className="border border-border rounded-xl overflow-hidden">
              {/* Topic header */}
              <div className="bg-muted/50 p-4 border-b border-border flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-lg font-medium text-foreground">{topic.name}</h2>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium bg-muted px-2 py-1 rounded">
                    LLM: {topic.llm_time.toFixed(1)}s
                  </span>
                  <SpeedupBadge
                    a={topic.gemini.time}
                    b={topic.recraft.time}
                    label="Gemini vs Recraft"
                  />
                </div>
              </div>

              {/* Provider columns */}
              <div className="grid grid-cols-2 gap-0 divide-x divide-border">
                {/* Gemini */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-sm font-medium">Gemini 3</span>
                    </div>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {topic.gemini.time.toFixed(1)}s
                    </span>
                  </div>
                  <button
                    onClick={() => setLightbox({ src: topic.gemini.image, label: "Gemini 3" })}
                    className="w-full aspect-[16/9] relative overflow-hidden bg-muted rounded-lg cursor-pointer group"
                  >
                    <img
                      src={topic.gemini.image}
                      alt={`${topic.name} - Gemini 3`}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </button>
                </div>

                {/* Recraft */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-purple-500" />
                      <span className="text-sm font-medium">Recraft V3</span>
                    </div>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {topic.recraft.time.toFixed(1)}s
                    </span>
                  </div>
                  <button
                    onClick={() => setLightbox({ src: topic.recraft.image, label: "Recraft V3" })}
                    className="w-full aspect-[16/9] relative overflow-hidden bg-muted rounded-lg cursor-pointer group"
                  >
                    <img
                      src={topic.recraft.image}
                      alt={`${topic.name} - Recraft V3`}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Lightbox */}
        {lightbox && (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setLightbox(null)}
          >
            <div className="relative max-w-5xl max-h-[90vh] w-full">
              {/* Provider label overlay */}
              <div className="absolute top-4 left-4 z-10 px-3 py-1.5 bg-black/60 text-white text-sm font-medium rounded-lg backdrop-blur">
                {lightbox.label}
              </div>
              <button
                className="absolute top-4 right-4 z-10 p-2 bg-black/50 text-white rounded-full backdrop-blur hover:bg-black/70"
                onClick={() => setLightbox(null)}
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
                src={lightbox.src}
                alt={`${lightbox.label} full size`}
                className="w-full h-auto max-h-[90vh] object-contain rounded-lg"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
