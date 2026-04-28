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
