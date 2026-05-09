import SignInButton from "@/app/components/SignInButton";

export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  // Only honor same-origin (relative) callbackUrls. NextAuth itself
  // also validates this, but failing fast here keeps the UX cleaner.
  const safe = callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : undefined;
  return (
    <div className="container">
      <div className="name">William Hickox</div>
      <div className="underline" />
      <div className="section">
        <div className="signin-card">
          <div className="signin-card-title">Sign in to continue</div>
          <SignInButton callbackUrl={safe} />
        </div>
      </div>
    </div>
  );
}
