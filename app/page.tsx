import { auth } from "@/auth";
import NavBar from "@/app/components/NavBar";
import TodoForm from "@/app/components/TodoForm";
import AiGuide from "@/app/components/AiGuide";
import SignInLink from "@/app/components/SignInLink";
import SignOutForm from "@/app/components/SignOutForm";
import FooterYear from "@/app/components/FooterYear";

export const dynamic = "force-dynamic";

// Public homepage. The todo form + AI guide are visible to every
// visitor. Authenticated visitors additionally see a NavBar with
// SSO links to the bot dashboards; unauthenticated visitors see
// only a small "Sign in" link in the corner. The TodoForm itself
// receives an `authenticated` flag so it knows whether to prompt
// for the PIN before submission.
export default async function Home() {
  const session = await auth();
  const email = session?.user?.email ?? null;

  return (
    <div className="container">
      <div className="header-row">
        <div>
          <div className="name">William Hickox</div>
          <div className="underline" />
        </div>
        <div className="auth-corner">
          {email ? (
            <>
              <span className="auth-email">{email}</span>
              <SignOutForm />
            </>
          ) : (
            <SignInLink />
          )}
        </div>
      </div>

      {email && <NavBar />}

      <div className="section">
        <div className="section-title">Add todo</div>
        <TodoForm authenticated={!!email} />
      </div>

      <div className="section ai-guide">
        <div className="section-title">AI agent API</div>
        <AiGuide />
      </div>

      <FooterYear />
    </div>
  );
}
