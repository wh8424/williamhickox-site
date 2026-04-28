import { signIn } from "@/auth";

// Server-action button. Mirrors the ops dashboard's signin form so
// the OAuth flow looks identical. After Google completes, NextAuth
// redirects to /.
export default function SignInButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signIn("google", { redirectTo: "/" });
      }}
    >
      <button type="submit" className="btn-signin">
        Sign in with Google
      </button>
    </form>
  );
}
