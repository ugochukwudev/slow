import { NextResponse } from "next/server";

export async function GET() {
  // Return a minimal response for accurate latency testing
  return new NextResponse(JSON.stringify({ timestamp: Date.now() }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}
