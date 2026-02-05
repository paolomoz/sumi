import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { BACKEND_URL } from "@/app/api/_helpers";

export async function POST(request: NextRequest) {
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

  // Forward the multipart form data directly to the backend
  const formData = await request.formData();

  const headers: Record<string, string> = {};
  if (sessionToken) {
    headers["X-Session-Token"] = sessionToken;
  }

  const res = await fetch(`${BACKEND_URL}/api/upload`, {
    method: "POST",
    headers,
    body: formData,
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
