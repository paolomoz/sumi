import { NextResponse } from "next/server";
import { BACKEND_URL, backendHeaders } from "@/app/api/_helpers";

export async function GET() {
  const headers = await backendHeaders();

  // No session token means not logged in — return empty list instead of 401
  if (!headers["X-Session-Token"]) {
    return NextResponse.json({ generations: [] });
  }

  const res = await fetch(`${BACKEND_URL}/api/history`, { headers });

  if (!res.ok) {
    return NextResponse.json({ generations: [] });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
