import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/create-todo
 *
 * Dual-auth: either an Auth.js session (signed-in homepage user)
 * OR a valid X-Todo-Pin header (anonymous visitors + iOS Shortcuts).
 * One of those must be present; otherwise 401.
 *
 * Forwards to ops.williamhickox.com/api/todos/public with the
 * server-held TODO_PUBLIC_API_KEY.
 */
const OPS_URL = "https://ops.williamhickox.com/api/todos/public";

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function POST(req: NextRequest) {
  // Path 1: signed-in via Auth.js → no PIN needed.
  const session = await auth();
  const sessionAuthed = !!session?.user?.email;

  // Path 2: anonymous + valid PIN. PIN check is constant-time vs the
  // server-held TODO_PIN env var. If TODO_PIN isn't set on this
  // deployment, the anonymous path is closed (only Auth.js works).
  let pinAuthed = false;
  if (!sessionAuthed) {
    const expected = process.env.TODO_PIN;
    const provided = req.headers.get("x-todo-pin");
    if (expected && provided && safeEqual(provided, expected)) {
      pinAuthed = true;
    }
  }

  if (!sessionAuthed && !pinAuthed) {
    return NextResponse.json(
      { error: "unauthorized — need Auth.js session or valid X-Todo-Pin" },
      { status: 401 },
    );
  }

  const apiKey = process.env.TODO_PUBLIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "TODO_PUBLIC_API_KEY not configured" },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  try {
    const upstream = await fetch(OPS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Todo-Api-Key": apiKey,
      },
      body: JSON.stringify(body ?? {}),
    });
    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "Content-Type":
          upstream.headers.get("content-type") || "application/json",
      },
    });
  } catch (e) {
    console.error("[/api/create-todo] upstream failed:", e);
    return NextResponse.json(
      { error: "upstream unreachable" },
      { status: 502 },
    );
  }
}
