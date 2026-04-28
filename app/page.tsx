import { auth } from "@/auth";
import SignInButton from "@/app/components/SignInButton";
import NavBar from "@/app/components/NavBar";
import TodoForm from "@/app/components/TodoForm";
import AiGuide from "@/app/components/AiGuide";
import SignOutForm from "@/app/components/SignOutForm";
import FooterYear from "@/app/components/FooterYear";

export const dynamic = "force-dynamic";

// Server component. The signed-in / signed-out paths render different
// trees rather than redirecting; pre-login still shows name + brand
// strip + the sign-in button so the page never looks broken.
export default async function Home() {
  const session = await auth();
  const email = session?.user?.email ?? null;

  return (
    <div className="container">
      <div className="name">William Hickox</div>
      <div className="underline" />

      {!email ? (
        <div className="section">
          <div className="signin-card">
            <div className="signin-card-title">Sign in to continue</div>
            <SignInButton />
          </div>
        </div>
      ) : (
        <>
          <div className="user-strip">
            <span>{email}</span>
            <SignOutForm />
          </div>

          <NavBar />

          <div className="section">
            <div className="section-title">Add todo</div>
            <TodoForm />
          </div>

          <div className="section ai-guide">
            <div className="section-title">AI agent API</div>
            <AiGuide />
          </div>
        </>
      )}

      <FooterYear />
    </div>
  );
}
