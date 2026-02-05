import { NextRequest, NextResponse } from "next/server";
import { BACKEND_URL, backendHeaders } from "@/app/api/_helpers";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const headers = await backendHeaders();
  const res = await fetch(`${BACKEND_URL}/api/jobs/${jobId}`, { headers });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
