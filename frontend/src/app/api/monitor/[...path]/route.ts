import { NextRequest, NextResponse } from "next/server";
import { BACKEND_URL } from "@/app/api/_helpers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const backendPath = path.join("/");
  const queryString = request.nextUrl.search;

  const res = await fetch(
    `${BACKEND_URL}/api/monitor/${backendPath}${queryString}`,
  );

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    return NextResponse.json(body, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
