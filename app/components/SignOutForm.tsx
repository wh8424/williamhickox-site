import { signOut } from "@/auth";

export default function SignOutForm() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
      }}
    >
      <button type="submit" className="btn-signout">
        sign out
      </button>
    </form>
  );
}
