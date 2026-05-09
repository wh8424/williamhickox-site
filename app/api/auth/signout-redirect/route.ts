import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

// Bot dashboards link here from their "Sign out" button. Manually
// expires the shared session cookie with the same Domain/Name/Path
// it was issued under, so the cookie disappears across every
// *.williamhickox.com subdomain in a single response. Then redirects
// to /signin.
//
// We don't call Auth.js signOut() here because it's primarily wired
// for server-action / form-POST flows. Manually clearing the cookie
// is deterministic and Set-Cookie headers honour the Domain attribute
// regardless of which subdomain served the response.
export async function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/signin", req.nextUrl.origin));
  res.cookies.set("__Secure-authjs.session-token-v2", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    domain: ".williamhickox.com",
    path: "/",
    maxAge: 0,
  });
  return res;
}
