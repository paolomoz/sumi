export interface Style {
  id: string;
  name: string;
  category: string;
  rating: number;
  mood: string[];
  color_palette: string[];
  best_for: string[];
  has_guide: boolean;
  description: string;
  guide?: string;
}

export interface StyleRecommendation {
  style_id: string;
  style_name: string;
  rationale: string;
  approach: "artistic" | "technical" | "accessible";
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  count: number;
}
