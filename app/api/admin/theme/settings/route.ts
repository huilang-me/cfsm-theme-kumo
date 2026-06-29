import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const TARGET = process.env.CFSM_DEV_TARGET ?? "http://localhost:3000";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const theme = request.nextUrl.searchParams.get("theme") ?? "";
  try {
    const upstream = await fetch(
      `${TARGET}/api/admin/theme/settings?theme=${encodeURIComponent(theme)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...Object.fromEntries(request.headers.entries()),
          Host: new URL(TARGET).host,
        },
        body,
      },
    );
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return Response.json(
      {
        status: "error",
        message: `Dev proxy failed: ${error instanceof Error ? error.message : error}`,
      },
      { status: 502 },
    );
  }
}
