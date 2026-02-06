"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

interface ComparisonResult {
  id: number;
  prompt: string;
  style: string;
  original: string;
  models: {
    "recraft-v3"?: string;
    "flux2"?: string;
  };
}

const MODEL_LABELS: Record<string, string> = {
  original: "Current (Gemini)",
  "recraft-v3": "Recraft V3",
  flux2: "FLUX.1 Pro",
};

export default function ModelComparisonPage() {
  const [results, setResults] = useState<ComparisonResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [selectedSample, setSelectedSample] = useState<ComparisonResult | null>(null);

  useEffect(() => {
    fetch("/model-comparison/manifest.json")
      .then((res) => res.json())
      .then((data) => {
        setResults(data);
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

  if (results.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-semibold mb-4">No Comparison Data Yet</h1>
          <p className="text-muted-foreground mb-4">
            Run the comparison script first:
          </p>
          <code className="block bg-muted p-4 rounded-lg text-sm text-left">
            cd backend && source .venv/bin/activate<br />
            python3 ../scripts/compare_models.py
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
            Image Model Comparison
          </h1>
          <p className="text-muted-foreground">
            Comparing Gemini (current) vs Recraft V3 vs FLUX.1 Pro for infographic generation
          </p>
        </header>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-8 p-4 bg-muted/50 rounded-lg">
          {Object.entries(MODEL_LABELS).map(([key, label]) => (
            <div key={key} className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  key === "original"
                    ? "bg-blue-500"
                    : key === "recraft-v3"
                    ? "bg-green-500"
                    : key === "flux2"
                    ? "bg-purple-500"
                    : "bg-orange-500"
                }`}
              />
              <span className="text-sm">{label}</span>
            </div>
          ))}
        </div>

        {/* Comparison Grid */}
        <div className="space-y-12">
          {results.map((result) => (
            <div key={result.id} className="border border-border rounded-xl overflow-hidden">
              {/* Header */}
              <div className="bg-muted/50 p-4 border-b border-border">
                <h2 className="text-lg font-medium text-foreground">
                  {result.prompt}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Style: {result.style}
                </p>
              </div>

              {/* Images Grid */}
              <div className="grid grid-cols-3 gap-1 p-1 bg-muted/30">
                {/* Original */}
                <div className="relative group">
                  <div className="absolute top-2 left-2 z-10 px-2 py-1 bg-blue-500 text-white text-xs font-medium rounded">
                    {MODEL_LABELS.original}
                  </div>
                  <button
                    onClick={() => {
                      setSelectedModel("original");
                      setSelectedSample(result);
                    }}
                    className="w-full aspect-[3/4] relative overflow-hidden bg-muted"
                  >
                    <Image
                      src={result.original}
                      alt={`${result.prompt} - Original`}
                      fill
                      className="object-cover hover:scale-105 transition-transform"
                    />
                  </button>
                </div>

                {/* Recraft V3 */}
                <div className="relative group">
                  <div className="absolute top-2 left-2 z-10 px-2 py-1 bg-green-500 text-white text-xs font-medium rounded">
                    {MODEL_LABELS["recraft-v3"]}
                  </div>
                  {result.models["recraft-v3"] ? (
                    <button
                      onClick={() => {
                        setSelectedModel("recraft-v3");
                        setSelectedSample(result);
                      }}
                      className="w-full aspect-[3/4] relative overflow-hidden bg-muted"
                    >
                      <Image
                        src={result.models["recraft-v3"]}
                        alt={`${result.prompt} - Recraft V3`}
                        fill
                        className="object-cover hover:scale-105 transition-transform"
                      />
                    </button>
                  ) : (
                    <div className="w-full aspect-[3/4] bg-muted flex items-center justify-center">
                      <span className="text-sm text-muted-foreground">Pending...</span>
                    </div>
                  )}
                </div>

                {/* FLUX.1 Pro */}
                <div className="relative group">
                  <div className="absolute top-2 left-2 z-10 px-2 py-1 bg-purple-500 text-white text-xs font-medium rounded">
                    {MODEL_LABELS.flux2}
                  </div>
                  {result.models.flux2 ? (
                    <button
                      onClick={() => {
                        setSelectedModel("flux2");
                        setSelectedSample(result);
                      }}
                      className="w-full aspect-[3/4] relative overflow-hidden bg-muted"
                    >
                      <Image
                        src={result.models.flux2}
                        alt={`${result.prompt} - FLUX.1 Pro`}
                        fill
                        className="object-cover hover:scale-105 transition-transform"
                      />
                    </button>
                  ) : (
                    <div className="w-full aspect-[3/4] bg-muted flex items-center justify-center">
                      <span className="text-sm text-muted-foreground">Pending...</span>
                    </div>
                  )}
                </div>

              </div>
            </div>
          ))}
        </div>

        {/* Lightbox */}
        {selectedSample && selectedModel && (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => {
              setSelectedSample(null);
              setSelectedModel(null);
            }}
          >
            <div className="relative max-w-4xl max-h-[90vh] w-full">
              <div className="absolute top-4 left-4 z-10 px-3 py-1.5 bg-black/50 text-white text-sm font-medium rounded-lg backdrop-blur">
                {MODEL_LABELS[selectedModel]} - {selectedSample.prompt}
              </div>
              <button
                className="absolute top-4 right-4 z-10 p-2 bg-black/50 text-white rounded-full backdrop-blur hover:bg-black/70"
                onClick={() => {
                  setSelectedSample(null);
                  setSelectedModel(null);
                }}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <Image
                src={
                  selectedModel === "original"
                    ? selectedSample.original
                    : selectedSample.models[selectedModel as keyof typeof selectedSample.models] || ""
                }
                alt={`${selectedSample.prompt} - ${MODEL_LABELS[selectedModel]}`}
                width={1200}
                height={1600}
                className="w-full h-auto max-h-[90vh] object-contain rounded-lg"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
