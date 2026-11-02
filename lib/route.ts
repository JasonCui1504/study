import type { NextRequest } from "next/server";
import { userFrom } from "./auth";

/** Thrown inside a handler to answer with that status and message. */
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const bad = (message: string) => new HttpError(400, message);

type Ctx<P> = { params: Promise<P> };

/** Wraps an API handler: signed-in only, JSON errors, `params` resolved. */
export function route<P = Record<string, never>>(
  handler: (request: NextRequest, params: P) => Promise<unknown>
) {
  return async (request: NextRequest, ctx: Ctx<P>): Promise<Response> => {
    if (!userFrom(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
    try {
      const out = await handler(request, await ctx.params);
      return out instanceof Response ? out : Response.json(out ?? { ok: true });
    } catch (err) {
      if (err instanceof HttpError) return Response.json({ error: err.message }, { status: err.status });
      console.error(err);
      return Response.json({ error: "Something went wrong" }, { status: 500 });
    }
  };
}

export async function body(request: NextRequest): Promise<Record<string, unknown>> {
  const b = await request.json().catch(() => null);
  if (!b || typeof b !== "object" || Array.isArray(b)) throw bad("Expected a JSON object");
  return b as Record<string, unknown>;
}

export const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v.trim() : fallback;
}

export function int(v: unknown, fallback: number | null = null): number | null {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? Math.round(n) : fallback;
}

export function id(v: unknown): number {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(404, "Not found");
  return n;
}
