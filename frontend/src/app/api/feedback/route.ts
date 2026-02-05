import { NextRequest, NextResponse } from "next/server";
import { BACKEND_URL, backendHeaders } from "../_helpers";

export async function POST(request: NextRequest) {
  const body = await request.json();

  const res = await fetch(`${BACKEND_URL}/api/feedback`, {
    method: "POST",
    headers: await backendHeaders(),
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
