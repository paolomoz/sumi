import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  // Verify authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { detail: "Authentication required" },
      { status: 401 }
    );
  }

  // Get session token to forward to backend
  const cookieStore = await cookies();
  const sessionToken =
    cookieStore.get("__Secure-authjs.session-token")?.value ||
    cookieStore.get("authjs.session-token")?.value;

  const { jobId } = await params;
  const headers: Record<string, string> = {
    Accept: "text/event-stream",
  };
  if (sessionToken) {
    headers["X-Session-Token"] = sessionToken;
  }

  const res = await fetch(`${BACKEND_URL}/api/jobs/${jobId}/stream`, {
    headers,
  });

  return new Response(res.body, {
    status: res.status,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
