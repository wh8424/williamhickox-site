import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/sso/mint
 *
 * Mints a short-lived (60s) HS256 JWT carrying the signed-in user's
 * email. The bot dashboards' /api/auth/sso endpoints redeem this for
 * their own local Bearer JWT (validated against shared SSO_SECRET +
 * each backend's own ALLOWED_EMAILS env).
 *
 * Auth: NextAuth session must exist. Caller is the homepage NavBar
 * onClick; nobody else should hit this.
 *
 * Returns: { token: <jwt> } on success. 401 unauthenticated, 503 if
 * SSO_SECRET isn't configured.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
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
  return NextResponse.json({ token });
}
