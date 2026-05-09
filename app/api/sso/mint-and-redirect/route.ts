import { NextResponse, type NextRequest } from "next/server";
import { SignJWT } from "jose";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

// Allowlisted bot subdomains. Any other ?bot= value is rejected to
// prevent this endpoint from acting as an open redirector minting
// tokens to attacker-controlled hosts.
const ALLOWED_BOTS = new Set<string>([
  "pfd.ea.williamhickox.com",
  "yield.williamhickox.com",
  "crypto.williamhickox.com",
]);

export async function GET(req: NextRequest) {
  const bot = req.nextUrl.searchParams.get("bot");
  if (!bot || !ALLOWED_BOTS.has(bot)) {
    return NextResponse.json(
      { error: "invalid bot parameter" },
      { status: 400 },
    );
  }

  const session = await auth();
  if (!session?.user?.email) {
    const callback = `/api/sso/mint-and-redirect?bot=${encodeURIComponent(bot)}`;
    const signinUrl = new URL("/signin", req.nextUrl.origin);
    signinUrl.searchParams.set("callbackUrl", callback);
    return NextResponse.redirect(signinUrl);
  }

  const secret = process.env.SSO_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "SSO_SECRET not configured" },
      { status: 503 },
    );
  }

  const token = await new SignJWT({ email: session.user.email.toLowerCase() })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("60s")
    .sign(new TextEncoder().encode(secret));

  return NextResponse.redirect(
    `https://${bot}/sso?token=${encodeURIComponent(token)}`,
  );
}
