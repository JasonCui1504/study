import type { Metadata } from "next";
import { setupAvailable } from "../../lib/auth";
import LoginForm from "./LoginForm";
import SetupForm from "./SetupForm";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  // Before the first account exists (and with a setup code configured), offer to create it.
  const setup = await setupAvailable().catch((err) => {
    console.error("Setup check failed (is the database configured?)", err);
    return false;
  });
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
          <h1 className="mb-1 text-lg font-medium text-prose">Welcome back</h1>
          <p className="mb-6 text-sm text-faint">Sign in to your study plan and flashcards.</p>
          <LoginForm />
        </>
      )}
    </div>
  );
}
