"use client";

import { useState, useCallback, useEffect } from "react";
import { showcaseSamples, type ShowcaseSample } from "@/data/showcase-samples";
import { useGenerationStore } from "@/lib/stores/generation-store";
import { cn } from "@/lib/utils";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function aspectToCss(ratio: string): string {
  const [w, h] = ratio.split(":");
  return `${w}/${h}`;
}

function ShowcaseCard({
  sample,
  index,
  onClick,
}: {
  sample: ShowcaseSample;
  index: number;
  onClick: () => void;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative w-full break-inside-avoid mb-4 rounded-[var(--radius-lg)] overflow-hidden border border-border hover:border-primary/30 transition-all cursor-pointer bg-card"
    >
      {/* Aspect ratio placeholder + image */}
      <div style={{ aspectRatio: aspectToCss(sample.aspectRatio) }} className="relative w-full">
        {!loaded && (
          <div className="absolute inset-0 skeleton rounded-none" />
        )}
        <img
          ref={useCallback((el: HTMLImageElement | null) => {
            if (el?.complete && el.naturalWidth > 0) setLoaded(true);
          }, [])}
          src={sample.imageUrl}
          alt={sample.prompt}
          loading={index < 4 ? "eager" : "lazy"}
          onLoad={() => setLoaded(true)}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-300",
            loaded ? "opacity-100" : "opacity-0"
          )}
          draggable={false}
        />
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-4">
        <span className="inline-flex self-start px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/20 text-white/90 backdrop-blur-sm mb-2">
          {sample.styleName}
        </span>
        <p className="text-sm text-white font-medium leading-snug line-clamp-2">
          {sample.prompt}
        </p>
      </div>
    </button>
  );
}

function Lightbox({
  sample,
  onClose,
}: {
  sample: ShowcaseSample;
  onClose: () => void;
}) {
  const { openWizard, setTopic, selectStyle, setStep } = useGenerationStore();

  const handleCreateSimilar = () => {
    onClose();
    openWizard();
    setTopic(sample.prompt);
    selectStyle(sample.styleId);
    setStep("style");
  };

  return (
    <DialogPrimitive.Root open onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-black/95 data-[state=open]:animate-in data-[state=open]:fade-in" />
        <DialogPrimitive.Content
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center p-4"
          aria-describedby={undefined}
        >
          <VisuallyHidden.Root>
            <DialogPrimitive.Title>{sample.prompt}</DialogPrimitive.Title>
          </VisuallyHidden.Root>

          {/* Close button */}
          <DialogPrimitive.Close
            className="absolute top-4 right-4 z-10 text-white/70 hover:text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </DialogPrimitive.Close>

          {/* Image */}
          <img
            src={sample.imageUrl}
            alt={sample.prompt}
            className="max-h-[80vh] max-w-[90vw] object-contain"
          />

          {/* Bottom bar */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-6 py-5 flex items-end justify-between gap-4">
            <div className="min-w-0 flex-1">
              <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/20 text-white/90 backdrop-blur-sm mb-1.5">
                {sample.styleName}
              </span>
              <p className="text-sm text-white/90 leading-snug line-clamp-2">
                {sample.prompt}
              </p>
            </div>
            <button
              type="button"
              onClick={handleCreateSimilar}
              className="shrink-0 px-4 py-2 rounded-full text-sm font-medium bg-white text-black hover:bg-white/90 transition-colors cursor-pointer"
            >
              Create similar
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function ShowcaseGrid() {
  const [samples, setSamples] = useState(showcaseSamples);
  useEffect(() => { setSamples(shuffle(showcaseSamples)); }, []);
  const [selectedSample, setSelectedSample] = useState<ShowcaseSample | null>(null);

  return (
    <>
      <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4">
        {samples.map((sample, i) => (
          <ShowcaseCard
            key={sample.id}
            sample={sample}
            index={i}
            onClick={() => setSelectedSample(sample)}
          />
        ))}
      </div>

      {selectedSample && (
        <Lightbox
          sample={selectedSample}
          onClose={() => setSelectedSample(null)}
        />
      )}
    </>
  );
}
