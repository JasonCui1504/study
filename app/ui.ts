// Shared client helpers and class names (same look as the travel budget pages).

/** JSON fetch for the API; throws the server's error message on failure. */
export async function api<T = unknown>(path: string, method = "GET", body?: unknown): Promise<T> {
  const res = await fetch(`/api/${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) window.location.href = "/login";
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data as T;
}

export const inputCls =
  "rounded border border-line bg-canvas px-2 py-1.5 text-sm text-prose outline-none placeholder:text-faint focus:border-accent";
export const btnCls =
  "rounded border border-accent bg-accent-dim px-3 py-1.5 text-sm text-prose transition-colors hover:bg-accent disabled:opacity-50";
export const quietBtnCls =
  "rounded border border-line px-3 py-1.5 text-sm text-subtle transition-colors hover:border-faint hover:text-prose disabled:opacity-50";
export const ghostCls = "text-xs text-faint transition-colors hover:text-prose";
export const panelCls = "rounded-lg border border-line bg-surface p-4 sm:p-5";
export const labelCls = "text-[11px] uppercase tracking-widest text-faint";

export function errMsg(err: unknown, fallback = "Something went wrong"): string {
  return err instanceof Error ? err.message : fallback;
}
