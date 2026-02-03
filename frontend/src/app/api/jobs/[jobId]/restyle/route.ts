import { NextRequest, NextResponse } from "next/server";
import { BACKEND_URL, backendHeaders } from "@/app/api/_helpers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const body = await request.json();
  const headers = await backendHeaders();
  const res = await fetch(`${BACKEND_URL}/api/jobs/${jobId}/restyle`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
