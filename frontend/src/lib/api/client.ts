import { Style, StyleRecommendation } from "@/types/style";
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

// Styles
export async function fetchStyles(params?: {
  category?: string;
  mood?: string;
  min_rating?: number;
  best_for?: string;
  search?: string;
}): Promise<Style[]> {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.set(key, String(value));
    });
  }
  const query = searchParams.toString();
  return fetchJson<Style[]>(`/styles${query ? `?${query}` : ""}`);
}

export async function fetchStyle(styleId: string): Promise<Style> {
  return fetchJson<Style>(`/styles/${styleId}`);
}

export async function fetchRecommendations(
  topic: string
): Promise<{ recommendations: StyleRecommendation[] }> {
  return fetchJson(`/styles/recommend`, {
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
