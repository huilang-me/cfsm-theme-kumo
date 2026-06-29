import type { NextRequest } from "next/server";

/**
 * DEV-ONLY proxy to the live CF-Server-Monitor instance.
 * Rewrites requests to the target backend.
 * Removed by scripts/package-theme.mjs before static export.
 */
export const dynamic = "force-dynamic";

const TARGET = process.env.CFSM_DEV_TARGET ?? "http://localhost:3000";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const targetPath = url.pathname + url.search;
  try {
    const upstream = await fetch(`${TARGET}${targetPath}`, {
      headers: {
        ...Object.fromEntries(request.headers.entries()),
        Host: new URL(TARGET).host,
      },
    });
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("Content-Type") ?? "application/json" },
    });
  } catch (error) {
    return Response.json(
      { error: `Dev proxy failed: ${error instanceof Error ? error.message : error}` },
      { status: 502 },
    );
  }
}

export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const targetPath = url.pathname + url.search;
  const body = await request.text();
  try {
    const upstream = await fetch(`${TARGET}${targetPath}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...Object.fromEntries(request.headers.entries()),
        Host: new URL(TARGET).host,
      },
      body,
    });
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("Content-Type") ?? "application/json" },
    });
  } catch (error) {
    return Response.json(
      { error: `Dev proxy failed: ${error instanceof Error ? error.message : error}` },
      { status: 502 },
    );
  }
}
