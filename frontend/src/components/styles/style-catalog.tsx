"use client";

import { useState, useMemo } from "react";
import { Style } from "@/types/style";
import { categories } from "@/data/categories";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { StyleGrid } from "./style-grid";

interface StyleCatalogProps {
  styles: Style[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}

export function StyleCatalog({ styles, selectedId, onSelect }: StyleCatalogProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const filtered = useMemo(() => {
    let result = styles;
    if (activeCategory !== "all") {
      result = result.filter((s) => s.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.mood.some((m) => m.includes(q))
      );
    }
    return result;
  }, [styles, activeCategory, search]);

  return (
    <div className="space-y-4">
      {/* Search */}
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search styles..."
      />

      {/* Category tabs */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList>
          <TabsTrigger value="all">All ({styles.length})</TabsTrigger>
          {categories.map((cat) => (
            <TabsTrigger key={cat.id} value={cat.id}>
              <span>{cat.icon}</span>
              {cat.name}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeCategory}>
          <StyleGrid
            styles={filtered}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
