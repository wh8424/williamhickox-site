import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

// Mirror of hickox-ops/dashboard/auth.ts. Same allowlist semantics —
// ALLOWED_EMAILS env is a comma-separated list of lowercased emails.
// An empty / unset list means no one can sign in (fail-closed).
const ALLOWED_EMAILS = (process.env.ALLOWED_EMAILS ?? "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  pages: { signIn: "/signin" },
  // Shared session cookie across *.williamhickox.com so a sign-in on
  // any subdomain authenticates all of them. CSRF stays host-only —
  // the __Host- prefix forbids a Domain attribute. Cookie name was
  // bumped to -v2 to avoid colliding with previously-issued host-only
  // cookies of the same name (RFC 6265 §5.4 would have served the
  // older host-only one first, silently breaking the rollout).
  cookies: {
    sessionToken: {
      name: "__Secure-authjs.session-token-v2",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: true,
        domain: ".williamhickox.com",
      },
    },
    csrfToken: {
      name: "__Host-authjs.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: true,
      },
    },
  },
  callbacks: {
    async signIn({ user }) {
      const email = user.email?.toLowerCase();
      if (!email) return false;
      if (!ALLOWED_EMAILS.includes(email)) {
        console.warn(`[auth] rejecting non-allowlisted email: ${email}`);
        return false;
      }
      return true;
    },
  },
  session: { strategy: "jwt" },
});
