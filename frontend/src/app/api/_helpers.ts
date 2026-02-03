import { auth } from "@/lib/auth";

export const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

/**
 * Build headers for proxied backend requests.
 * Injects X-User-ID from the Auth.js session when the user is logged in.
 */
export async function backendHeaders(
  extra?: Record<string, string>,
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...extra,
  };

  try {
    const session = await auth();
    if (session?.user?.id) {
      headers["X-User-ID"] = session.user.id;
    }
  } catch {
    // Auth not configured or session unavailable — proceed without user ID
  }

  return headers;
}
