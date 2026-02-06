import { Layout, Style } from "@/types/style";
import { GenerateRequest, GenerationHistoryItem, JobStatus } from "@/types/generation";

const API_BASE = "/api";

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    let message = "Request failed";
    if (typeof error.detail === "string") {
      message = error.detail;
    } else if (Array.isArray(error.detail)) {
      // FastAPI validation errors: [{loc, msg, type}, ...]
      message = error.detail.map((e: { msg: string }) => e.msg).join("; ");
    }
    throw new Error(message);
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
  request: { style_id: string; layout_id?: string; aspect_ratio?: string; language?: string; mode?: string }
): Promise<{ job_id: string }> {
  return fetchJson(`/jobs/${jobId}/restyle`, {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export function createJobSSE(jobId: string): EventSource {
  return new EventSource(`${API_BASE}/jobs/${jobId}/stream`);
}

export async function confirmSelection(
  jobId: string,
  request: { layout_id: string; style_id: string }
): Promise<void> {
  await fetchJson(`/jobs/${jobId}/confirm`, {
    method: "POST",
    body: JSON.stringify(request),
  });
}

// File upload
export interface UploadResponse {
  text: string;
  file_names: string[];
  char_count: number;
}

export async function uploadFiles(files: File[]): Promise<UploadResponse> {
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }
  const response = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    let message = "Upload failed";
    if (typeof error.detail === "string") {
      message = error.detail;
    } else if (Array.isArray(error.detail)) {
      message = error.detail.map((e: { msg: string }) => e.msg).join("; ");
    }
    throw new Error(message);
  }
  return response.json();
}

// History
export async function fetchHistory(): Promise<GenerationHistoryItem[]> {
  const data = await fetchJson<{ generations: GenerationHistoryItem[] }>("/history");
  return data.generations;
}
