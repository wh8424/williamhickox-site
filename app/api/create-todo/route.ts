import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/create-todo
 *
 * Replaces the legacy api/create-todo.js Vercel function. Used to
 * require a PIN-as-secret because the homepage was anonymous; now
 * that the homepage is gated by Auth.js, the PIN is dropped — a
 * NextAuth session is the only requirement.
 *
 * Forwards to ops.williamhickox.com/api/todos/public with the
 * server-held TODO_PUBLIC_API_KEY (still required upstream).
 */
const OPS_URL = "https://ops.williamhickox.com/api/todos/public";

export async function POST(req: NextRequest) {
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
