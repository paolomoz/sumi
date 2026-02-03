import { Layout, Style, CombinationRecommendation } from "@/types/style";
import { GenerateRequest, GenerationHistoryItem, JobStatus } from "@/types/generation";

const API_BASE = "/api";

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || "Request failed");
  }
  return response.json();
}

// Layouts
export async function fetchLayouts(): Promise<Layout[]> {
  return fetchJson<Layout[]>("/layouts");
}

export async function fetchLayout(layoutId: string): Promise<Layout> {
  return fetchJson<Layout>(`/layouts/${layoutId}`);
}

// Styles
export async function fetchStyles(): Promise<Style[]> {
  return fetchJson<Style[]>("/styles");
}

export async function fetchStyle(styleId: string): Promise<Style> {
  return fetchJson<Style>(`/styles/${styleId}`);
}

// Recommendations
export async function fetchRecommendations(
  topic: string
): Promise<{ recommendations: CombinationRecommendation[] }> {
  return fetchJson(`/recommend`, {
    method: "POST",
    body: JSON.stringify({ topic }),
  });
}

// Generation
export async function startGeneration(
  request: GenerateRequest
): Promise<{ job_id: string }> {
  return fetchJson(`/generate`, {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function fetchJobStatus(jobId: string): Promise<JobStatus> {
  return fetchJson<JobStatus>(`/jobs/${jobId}`);
}

export async function restyleJob(
  jobId: string,
  request: { style_id: string; layout_id?: string; aspect_ratio?: string; language?: string }
): Promise<{ job_id: string }> {
  return fetchJson(`/jobs/${jobId}/restyle`, {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export function createJobSSE(jobId: string): EventSource {
  return new EventSource(`${API_BASE}/jobs/${jobId}/stream`);
}

// History
export async function fetchHistory(): Promise<GenerationHistoryItem[]> {
  const data = await fetchJson<{ generations: GenerationHistoryItem[] }>("/history");
  return data.generations;
}
