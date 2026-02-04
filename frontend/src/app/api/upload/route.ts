import { NextRequest, NextResponse } from "next/server";
import { BACKEND_URL } from "@/app/api/_helpers";

export async function POST(request: NextRequest) {
  // Forward the multipart form data directly to the backend
  const formData = await request.formData();

  const res = await fetch(`${BACKEND_URL}/api/upload`, {
    method: "POST",
    body: formData,
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
