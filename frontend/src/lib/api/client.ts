import { Layout, Style, CombinationRecommendation } from "@/types/style";
import { GenerateRequest, JobStatus } from "@/types/generation";

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

export function createJobSSE(jobId: string): EventSource {
  return new EventSource(`${API_BASE}/jobs/${jobId}/stream`);
}
