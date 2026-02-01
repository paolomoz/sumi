export interface Layout {
  id: string;
  name: string;
  best_for: string[];
  recommended_pairings: string[];
  content?: string;
}

export interface Style {
  id: string;
  name: string;
  best_for: string;
  content?: string;
}

export interface CombinationRecommendation {
  layout_id: string;
  layout_name: string;
  style_id: string;
  style_name: string;
  rationale: string;
  approach: "best_match" | "creative" | "accessible";
}
