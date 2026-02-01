"use client";

import { useStyles } from "@/lib/hooks/use-styles";
import { StyleCatalog } from "./style-catalog";

export function StyleCatalogView() {
  const { data: styles, isLoading } = useStyles();

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Style Catalog</h1>
        <p className="text-muted text-sm mt-1">
          Browse all {styles?.length ?? 126} artistic styles available for your infographics.
        </p>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted text-sm">
          Loading styles...
        </div>
      ) : styles ? (
        <StyleCatalog styles={styles} />
      ) : null}
    </div>
  );
}
