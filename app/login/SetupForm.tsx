"use client";

import { useState } from "react";

/** First-run setup: create the one login, with the setup code from Vercel. */
export default function SetupForm() {
  const [code, setCode] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) return setError("The passwords don't match");
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, username: username.trim().toLowerCase(), password }),
      });
      if (res.ok) {
        window.location.href = "/settings";
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Couldn't create the account");
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const field =
    "w-full rounded-sm border border-line bg-lift px-4 py-2.5 text-sm text-prose placeholder:text-faint focus:border-accent focus:outline-none";
  return (
    <form onSubmit={submit} className="space-y-3">
      <input autoFocus value={code} onChange={(e) => setCode(e.target.value)} placeholder="Setup code" autoComplete="off" className={field} />
      <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" autoComplete="username" className={field} />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password (8+ characters)"
        autoComplete="new-password"
        className={field}
      />
      <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Password again" autoComplete="new-password" className={field} />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        disabled={loading || !code || !username || password.length < 8 || !confirm}
        className="w-full rounded-sm bg-accent py-2.5 text-sm text-prose transition-opacity disabled:opacity-50"
      >
        {loading ? "Creating…" : "Create account"}
      </button>
    </form>
  );
}
