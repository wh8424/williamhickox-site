import SignInButton from "@/app/components/SignInButton";

export const dynamic = "force-dynamic";

// Standalone sign-in page — Auth.js redirects here when a callbackUrl
// requires a session. After successful Google OAuth, NextAuth lands
// the user back on /. The homepage handles its own logged-out state
// so a direct hit on /signin is mostly for the redirect case.
export default function SignInPage() {
  return (
    <div className="container">
      <div className="name">William Hickox</div>
      <div className="underline" />
      <div className="section">
        <div className="signin-card">
          <div className="signin-card-title">Sign in to continue</div>
          <SignInButton />
        </div>
      </div>
    </div>
  );
}
