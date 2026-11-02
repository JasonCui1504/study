import { NextRequest } from "next/server";
import { configured, createFirstUser, createSessionToken, sessionCookieHeader, setupAvailable, validSetupCode } from "../../../lib/auth";

// Creates the first login from the browser (see "First-run setup" in lib/auth.ts).

// Per-IP throttle on setup-code guesses (best effort: in-memory, per instance).
const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000;

function limited(ip: string): boolean {
  const now = Date.now();
  const e = attempts.get(ip);
  if (!e || now > e.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  e.count++;
  return e.count > MAX_ATTEMPTS;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (limited(ip)) return Response.json({ error: "Too many attempts. Try again in 15 minutes." }, { status: 429 });
  if (!configured()) return Response.json({ error: "STUDY_SESSION_SECRET is missing in Vercel" }, { status: 500 });
  if (!(await setupAvailable())) return Response.json({ error: "Setup is closed: an account already exists" }, { status: 403 });

  const { code, username, password } = await request.json().catch(() => ({}));
  const user = typeof username === "string" ? username.trim().toLowerCase() : "";
  if (typeof code !== "string" || !validSetupCode(code)) return Response.json({ error: "That setup code isn't right" }, { status: 401 });
  if (!/^[a-z0-9_-]{2,32}$/.test(user)) return Response.json({ error: "Username: 2–32 letters, numbers, - or _" }, { status: 400 });
  if (typeof password !== "string" || password.length < 8) return Response.json({ error: "Use a password of at least 8 characters" }, { status: 400 });
  if (!(await createFirstUser(user, password))) return Response.json({ error: "Setup is closed: an account already exists" }, { status: 403 });

  attempts.delete(ip);
  const res = Response.json({ ok: true, user }, { status: 201 });
  res.headers.set("Set-Cookie", sessionCookieHeader(createSessionToken(user)));
  return res;
}
