const API_BASE = "/api/monitor";

export interface VolumeStats {
  total: number;
  last_hour: number;
  last_day: number;
  last_7_days: number;
  last_30_days: number;
}

export interface LeaderboardEntry {
  user_id: string;
  generation_count: number;
  last_active: string;
}

export interface StyleEntry {
  style_id: string;
  style_name: string;
  count: number;
}

export interface GenerationItem {
  id: string;
  user_id: string;
  topic: string;
  style_id: string | null;
  style_name: string | null;
  layout_id: string | null;
  layout_name: string | null;
  aspect_ratio: string;
  created_at: string;
}

export interface GenerationsResponse {
  generations: GenerationItem[];
  total: number;
}

export interface MultiStyleEntry {
  user_id: string;
  topic: string;
  style_count: number;
  styles: string;
  first_created: string;
  last_created: string;
}

export interface FeedbackItem {
  id: string;
  user_id: string | null;
  content: string;
  category: string | null;
  is_actionable: boolean;
  status: string;
  pr_url: string | null;
  created_at: string;
}

export interface FeedbackResponse {
  feedback: FeedbackItem[];
  total: number;
  by_category: Record<string, number>;
  by_status: Record<string, number>;
}

async function monitorFetch<T>(path: string, key: string): Promise<T> {
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${API_BASE}/${path}${sep}key=${encodeURIComponent(key)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    const error = new Error(err.detail || "Request failed");
    (error as Error & { status: number }).status = res.status;
    throw error;
  }
  return res.json();
}

export function fetchStats(key: string) {
  return monitorFetch<VolumeStats>("stats", key);
}

export function fetchLeaderboard(key: string) {
  return monitorFetch<LeaderboardEntry[]>("leaderboard", key);
}

export function fetchStyles(key: string) {
  return monitorFetch<StyleEntry[]>("styles", key);
}

export function fetchGenerations(key: string, limit: number, offset: number) {
  return monitorFetch<GenerationsResponse>(
    `generations?limit=${limit}&offset=${offset}`,
    key,
  );
}

export function fetchMultiStyle(key: string) {
  return monitorFetch<MultiStyleEntry[]>("multi-style", key);
}

export function fetchFeedback(key: string, limit: number, offset: number) {
  return monitorFetch<FeedbackResponse>(
    `feedback?limit=${limit}&offset=${offset}`,
    key,
  );
}
