import { all, run } from "./db";

export type Settings = {
  exam_date: string | null;
  plan_start: string | null;
  /** Study hours available per weekday, Sunday first. */
  hours: number[];
  /** Specific dates with no studying. */
  days_off: string[];
  /** When study blocks start each day, in minutes after midnight. */
  day_start_min: number;
  new_per_day: number;
  max_reviews: number;
  retention: number;
  time_zone: string;
};

export const DEFAULT_SETTINGS: Settings = {
  exam_date: null,
  plan_start: null,
  hours: [5, 4, 4, 4, 4, 4, 6],
  days_off: [],
  day_start_min: 9 * 60,
  new_per_day: 20,
  max_reviews: 250,
  retention: 0.9,
  time_zone: "America/New_York",
};

export async function getSettings(): Promise<Settings> {
  const rows = await all<{ key: string; value: string }>("SELECT key, value FROM settings");
  const s: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const r of rows) {
    if (!(r.key in DEFAULT_SETTINGS)) continue;
    try {
      s[r.key] = JSON.parse(r.value);
    } catch {
      // keep the default
    }
  }
  return s as Settings;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Validates and saves whichever known keys are present; returns the result. */
export async function saveSettings(patch: Record<string, unknown>): Promise<Settings> {
  const clean: Partial<Settings> = {};
  const num = (v: unknown, lo: number, hi: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : null);
  if ("exam_date" in patch) clean.exam_date = typeof patch.exam_date === "string" && DATE.test(patch.exam_date) ? patch.exam_date : null;
  if ("plan_start" in patch) clean.plan_start = typeof patch.plan_start === "string" && DATE.test(patch.plan_start) ? patch.plan_start : null;
  if (Array.isArray(patch.hours) && patch.hours.length === 7) clean.hours = patch.hours.map((h) => num(Number(h), 0, 14) ?? 0);
  if (Array.isArray(patch.days_off)) clean.days_off = [...new Set(patch.days_off.filter((d): d is string => typeof d === "string" && DATE.test(d)))].sort();
  if ("day_start_min" in patch) clean.day_start_min = Math.round(num(patch.day_start_min, 0, 20 * 60) ?? DEFAULT_SETTINGS.day_start_min);
  if ("new_per_day" in patch) clean.new_per_day = Math.round(num(patch.new_per_day, 0, 500) ?? DEFAULT_SETTINGS.new_per_day);
  if ("max_reviews" in patch) clean.max_reviews = Math.round(num(patch.max_reviews, 10, 5000) ?? DEFAULT_SETTINGS.max_reviews);
  if ("retention" in patch) clean.retention = num(patch.retention, 0.7, 0.97) ?? DEFAULT_SETTINGS.retention;
  if (typeof patch.time_zone === "string") {
    try {
      clean.time_zone = new Intl.DateTimeFormat("en-US", { timeZone: patch.time_zone }).resolvedOptions().timeZone;
    } catch {
      // ignore an unknown zone
    }
  }
  for (const [k, v] of Object.entries(clean)) {
    await run("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", [k, JSON.stringify(v)]);
  }
  return getSettings();
}
