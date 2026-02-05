import { NextRequest, NextResponse } from "next/server";
import { BACKEND_URL, backendHeaders } from "../../_helpers";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ feedbackId: string }> }
) {
  const { feedbackId } = await params;

  const res = await fetch(`${BACKEND_URL}/api/feedback/${feedbackId}`, {
    headers: await backendHeaders(),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
