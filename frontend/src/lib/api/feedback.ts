const API_BASE = "/api";

export interface FeedbackSubmitResponse {
  feedback_id: string;
}

export interface FeedbackStatus {
  feedback_id: string;
  status: string;
  category: string | null;
  is_actionable: boolean;
  pr_url: string | null;
  pr_branch: string | null;
  error: string | null;
}

export interface FeedbackSSEEvent {
  type: string;
  status: string;
  progress: number;
  message: string;
  category: string | null;
  is_actionable: boolean;
  pr_url: string | null;
}

export async function submitFeedback(content: string): Promise<FeedbackSubmitResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

  try {
    const response = await fetch(`${API_BASE}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      let message = "Failed to submit feedback";
      if (typeof error.detail === "string") {
        message = error.detail;
      } else if (Array.isArray(error.detail)) {
        message = error.detail.map((e: { msg: string }) => e.msg).join("; ");
      }
      throw new Error(message);
    }

    return response.json();
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Request timed out. The server may be busy - please try again.");
    }
    throw err;
  }
}

export async function getFeedbackStatus(feedbackId: string): Promise<FeedbackStatus> {
  const response = await fetch(`${API_BASE}/feedback/${feedbackId}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || "Failed to get feedback status");
  }

  return response.json();
}

export function createFeedbackSSE(feedbackId: string): EventSource {
  return new EventSource(`${API_BASE}/feedback/${feedbackId}/stream`);
}
