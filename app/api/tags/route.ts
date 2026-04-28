import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/tags
 *
 * Public — no auth check. The autocomplete is used by the public
 * homepage todo form, and the underlying ops endpoint already
 * requires the server-held TODO_PUBLIC_API_KEY (which never reaches
 * the browser). Read-only, no side effects, low risk.
 */
const OPS_URL = "https://ops.williamhickox.com/api/todos/tags";

export async function GET() {
  const apiKey = process.env.TODO_PUBLIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "TODO_PUBLIC_API_KEY not configured" },
      { status: 503 },
    );
  }
  try {
    const upstream = await fetch(OPS_URL, {
      method: "GET",
      headers: { "X-Todo-Api-Key": apiKey },
    });
    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "Content-Type":
          upstream.headers.get("content-type") || "application/json",
        // Public read-only endpoint; can be edge-cached briefly.
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      },
    });
  } catch (e) {
    console.error("[/api/tags] upstream failed:", e);
    return NextResponse.json(
      { error: "upstream unreachable" },
      { status: 502 },
    );
  }
}
