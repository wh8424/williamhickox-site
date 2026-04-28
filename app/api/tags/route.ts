import { NextResponse } from "next/server";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/tags
 *
 * Replaces api/tags.js. Auth-gated now (NextAuth session required —
 * the autocomplete is only used inside the signed-in homepage form).
 * Forwards to ops.williamhickox.com/api/todos/tags using the
 * server-held TODO_PUBLIC_API_KEY.
 */
const OPS_URL = "https://ops.williamhickox.com/api/todos/tags";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
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
        // Match the prior Vercel-fn cache hint so repeated form
        // opens during one session don't slam upstream.
        "Cache-Control": "private, max-age=60",
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
