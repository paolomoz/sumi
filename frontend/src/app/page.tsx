"use client";

import { useState, useCallback } from "react";
import { HomeHero } from "@/components/home/home-hero";
import { ShowcaseGrid } from "@/components/home/showcase-grid";

export default function Home() {
  const [preselectedStyle, setPreselectedStyle] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const handleCreateSimilar = useCallback(
    (styleId: string, styleName: string) => {
      setPreselectedStyle({ id: styleId, name: styleName });
      // Defer scroll so the lightbox dialog has time to unmount
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    },
    []
  );

  return (
    <div className="flex flex-col items-center min-h-full px-4 pt-[18vh] pb-12">
      {/* Hero + Input */}
      <div className="w-full max-w-2xl space-y-6 mb-24">
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-semibold tracking-tight">
            What can I create for you?
          </h1>
          <p className="text-muted text-base">
            Describe a topic and we&apos;ll generate a beautiful infographic with 20
            layouts and 16 artistic styles.
          </p>
        </div>

        <HomeHero
          preselectedStyle={preselectedStyle}
          onClearStyle={() => setPreselectedStyle(null)}
        />
      </div>

      {/* Showcase grid */}
      <div className="w-full max-w-7xl">
        <h2 className="text-xs font-medium text-muted uppercase tracking-wider mb-6">
          Featured Creations
        </h2>
        <ShowcaseGrid onCreateSimilar={handleCreateSimilar} />
      </div>
    </div>
  );
}
