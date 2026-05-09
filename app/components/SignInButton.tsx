import { signIn } from "@/auth";

export default function SignInButton({ callbackUrl }: { callbackUrl?: string }) {
  return (
    <form
      action={async () => {
        "use server";
        await signIn("google", { redirectTo: callbackUrl ?? "/" });
      }}
    >
      <button type="submit" className="btn-signin">
        Sign in with Google
      </button>
    </form>
  );
}
