import { signIn } from "@/auth";

// Small inline "Sign in" link rendered in the homepage's auth-corner
// when no NextAuth session exists. Same server action as
// SignInButton, just text-link-styled — non-blocking, doesn't
// occupy the prominent center-of-page real estate the public todo
// form needs.
export default function SignInLink() {
  return (
    <form
      action={async () => {
        "use server";
        await signIn("google", { redirectTo: "/" });
      }}
    >
      <button type="submit" className="auth-link">
        Sign in
      </button>
    </form>
  );
}
