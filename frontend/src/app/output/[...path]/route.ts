import { NextRequest } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const res = await fetch(`${BACKEND_URL}/output/${path.join("/")}`);

  return new Response(res.body, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("Content-Type") || "application/octet-stream",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
