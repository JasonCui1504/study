import { createHmac, scryptSync, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";
import { getDb } from "./db";

// Username + password login (same scheme as the photography site's travel
// budget). Logins live in the database (table study_users, scrypt
// "salt:hash" per user), set with
//   node scripts/set-password.mjs <user> [--env .env.prod]
// A user not in the table falls back to STUDY_USERS (JSON of the same hashes).
// Sessions are HMAC-signed with STUDY_SESSION_SECRET and expire after 30 days.

export const STUDY_COOKIE = "study_session";
const MAX_AGE_S = 60 * 60 * 24 * 30;

function envUsers(): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(process.env.STUDY_USERS || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

async function storedHash(username: string): Promise<string | null> {
  try {
    const db = await getDb();
    const rs = await db.execute({ sql: "SELECT hash FROM study_users WHERE username = ?", args: [username] });
    if (rs.rows.length) return String(rs.rows[0].hash);
  } catch (err) {
    console.warn("study_users lookup failed; falling back to STUDY_USERS", err);
  }
  const fromEnv = envUsers()[username] ?? null;
  if (!fromEnv) console.warn(`Study sign-in: no login stored for "${username}" in study_users or STUDY_USERS`);
  return fromEnv;
}

function secret(): string | null {
  return process.env.STUDY_SESSION_SECRET || null;
}

function sign(payload: string): string {
  return createHmac("sha256", secret() ?? "").update(payload).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function configured(): boolean {
  return secret() != null;
}

export async function validateCredentials(username: string, password: string): Promise<boolean> {
  const stored = await storedHash(username);
  if (!stored) return false;
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  try {
    const ok = safeEqual(scryptSync(password, salt, 64).toString("hex"), hash);
    if (!ok) console.warn(`Study sign-in: wrong password for "${username}"`);
    return ok;
  } catch {
    return false;
  }
}

export function createSessionToken(username: string): string {
  const expires = Math.floor(Date.now() / 1000) + MAX_AGE_S;
  const payload = `${username}:${expires}`;
  return `${payload}:${sign(payload)}`;
}

/** The signed-in username, or null for a missing, forged or expired session. */
export function verifySessionToken(token: string | undefined): string | null {
  if (!token || !secret()) return null;
  const parts = token.split(":");
  if (parts.length !== 3) return null;
  const [username, expires, sig] = parts;
  if (!/^[0-9a-f]+$/.test(sig) || !safeEqual(sign(`${username}:${expires}`), sig)) return null;
  if (Number(expires) < Math.floor(Date.now() / 1000)) return null;
  return username;
}

export function sessionCookieHeader(token: string): string {
  return `${STUDY_COOKIE}=${token}; HttpOnly; Path=/; Max-Age=${MAX_AGE_S}; SameSite=Lax${process.env.VERCEL ? "; Secure" : ""}`;
}

export function clearCookieHeader(): string {
  return `${STUDY_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`;
}

/** For API routes: the username, or null. */
export function userFrom(request: NextRequest): string | null {
  return verifySessionToken(request.cookies.get(STUDY_COOKIE)?.value);
}

/**
 * The secret in the study plan's calendar-feed link. Calendar apps fetch the
 * feed from their own servers and can't sign in, so the link itself is the
 * key. Changing STUDY_SESSION_SECRET changes it (and breaks subscriptions).
 */
export function calendarToken(): string {
  return sign("calendar:plan").slice(0, 32);
}

export function validCalendarToken(token: string | null): boolean {
  return !!token && !!secret() && /^[0-9a-f]{32}$/.test(token) && safeEqual(calendarToken(), token);
}
