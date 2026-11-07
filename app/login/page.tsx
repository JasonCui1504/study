import type { Metadata } from "next";
import { setupState } from "../../lib/auth";
import LoginForm from "./LoginForm";
import SetupForm from "./SetupForm";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  // Before the first account exists (and with a setup code configured), offer to create it.
  // Until then, say what's missing rather than show a sign-in form that can't work.
  const status = await setupState();
  const setup = status.state === "open";
  const problem =
    status.state === "db_error"
      ? status.detail
      : status.state === "no_secret"
        ? "STUDY_SESSION_SECRET isn't set for this deployment."
        : status.state === "no_code"
          ? "No account exists yet. To create one here, add STUDY_SETUP_CODE in Vercel (Production), then redeploy."
          : null;
  return (
    <div className="mx-auto mt-24 w-full max-w-xs px-4">
      <p className="mb-6 text-sm font-medium uppercase tracking-widest text-prose">
        MCAT<span className="text-faint"> · Study</span>
      </p>
      {setup ? (
        <>
          <h1 className="mb-1 text-lg font-medium text-prose">Create your account</h1>
          <p className="mb-6 text-sm text-faint">
            Enter the setup code you saved in Vercel as <code className="text-subtle">STUDY_SETUP_CODE</code>, then choose your login. This page
            closes once the account exists.
          </p>
          <SetupForm />
        </>
      ) : (
        <>
          {problem && (
            <div className="mb-6 rounded border border-[#c98500]/50 bg-[#c98500]/10 p-3 text-sm text-subtle">
              <p className="mb-1 font-medium text-prose">Setup needed</p>
              <p>{problem}</p>
              <p className="mt-2 text-xs text-faint">
                In Vercel: Settings → Environment Variables, then Deployments → ⋯ → Redeploy. New variables only apply to a new deployment.
              </p>
            </div>
          )}
          <h1 className="mb-1 text-lg font-medium text-prose">Welcome back</h1>
          <p className="mb-6 text-sm text-faint">Sign in to your study plan and flashcards.</p>
          <LoginForm />
        </>
      )}
    </div>
  );
}
