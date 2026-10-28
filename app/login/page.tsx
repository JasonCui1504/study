import type { Metadata } from "next";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="mx-auto mt-24 w-full max-w-xs px-4">
      <p className="mb-6 text-sm font-medium uppercase tracking-widest text-prose">
        MCAT<span className="text-faint"> · Study</span>
      </p>
      <h1 className="mb-1 text-lg font-medium text-prose">Welcome back</h1>
      <p className="mb-6 text-sm text-faint">Sign in to your study plan and flashcards.</p>
      <LoginForm />
    </div>
  );
}
