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

// Every error path ends in a redirect — never raw JSON. A user landing
// on a stringified error here can't recover; a redirect to / or /signin
// always gives them a way forward, and the bot-side 30s debounce
// prevents this from looping if /signin → mint-and-redirect → bot keeps
// failing.
export async function GET(req: NextRequest) {
  const home = new URL("/", req.nextUrl.origin);

  const bot = req.nextUrl.searchParams.get("bot");
  if (!bot || !ALLOWED_BOTS.has(bot)) {
    return NextResponse.redirect(home);
  }

  let session;
  try {
    session = await auth();
  } catch {
    return NextResponse.redirect(home);
  }

  if (!session?.user?.email) {
    const callback = `/api/sso/mint-and-redirect?bot=${encodeURIComponent(bot)}`;
    const signinUrl = new URL("/signin", req.nextUrl.origin);
    signinUrl.searchParams.set("callbackUrl", callback);
    return NextResponse.redirect(signinUrl);
  }

  const secret = process.env.SSO_SECRET;
  if (!secret) {
    return NextResponse.redirect(home);
  }

  try {
    const token = await new SignJWT({
      email: session.user.email.toLowerCase(),
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("60s")
      .sign(new TextEncoder().encode(secret));

    return NextResponse.redirect(
      `https://${bot}/sso?token=${encodeURIComponent(token)}`,
    );
  } catch {
    return NextResponse.redirect(home);
  }
}
