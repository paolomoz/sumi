import { Category } from "@/types/style";

export const categories: Category[] = [
  { id: "japanese", name: "Japanese", color: "#C84B31", icon: "🏯", count: 11 },
  { id: "art-nouveau", name: "Art Nouveau", color: "#7B6D4E", icon: "🌿", count: 10 },
  { id: "modern", name: "Modern", color: "#2563EB", icon: "🎨", count: 11 },
  { id: "illustration", name: "Illustration", color: "#9333EA", icon: "✏️", count: 11 },
  { id: "print", name: "Print", color: "#374151", icon: "🖨️", count: 10 },
  { id: "folk", name: "Folk Art", color: "#D97706", icon: "🪆", count: 11 },
  { id: "digital", name: "Digital", color: "#06B6D4", icon: "💻", count: 11 },
  { id: "classical", name: "Classical", color: "#92400E", icon: "🏛️", count: 10 },
  { id: "asian", name: "Asian", color: "#DC2626", icon: "🐉", count: 11 },
  { id: "street", name: "Street Art", color: "#16A34A", icon: "🧱", count: 10 },
  { id: "craft", name: "Craft", color: "#B45309", icon: "🧵", count: 10 },
  { id: "fantasy", name: "Fantasy", color: "#7C3AED", icon: "🐲", count: 10 },
];

export const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c]));
