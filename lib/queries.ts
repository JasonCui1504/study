import { all, getDb, one } from "./db";
import { buildPlan } from "./planner";
import { getSettings, type Settings } from "./settings";
import { addDays, localDate, weekStart } from "./time";

export type Task = {
  id: number;
  date: string;
  start_min: number | null;
  duration_min: number;
  title: string;
  kind: string;
  section: string;
  topic_id: string | null;
  notes: string;
  done: number;
  auto: number;
};

export type StudySession = {
  id: number;
  started_at: string;
  ended_at: string | null;
  local_date: string;
  minutes: number;
  section: string;
  topic_id: string | null;
  task_id: number | null;
  notes: string;
};

export function today(settings: Settings, now = new Date()): string {
  return localDate(now, settings.time_zone);
}

// ─── Study sessions ─────────────────────────────────────────────

export function openSession(): Promise<StudySession | null> {
  return one<StudySession>("SELECT * FROM sessions WHERE ended_at IS NULL ORDER BY id DESC LIMIT 1");
}

/** Minutes so far for an open session. */
export function liveMinutes(s: StudySession, now = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - Date.parse(s.started_at)) / 60000));
}

/**
 * Study minutes per local day between two dates (inclusive), by section.
 * Includes the open session's time so far, so today's numbers are live.
 */
export async function minutesByDay(from: string, to: string): Promise<Map<string, Record<string, number>>> {
  const rows = await all<{ local_date: string; section: string; m: number }>(
    `SELECT local_date, section, SUM(minutes) AS m FROM sessions
     WHERE ended_at IS NOT NULL AND local_date BETWEEN ? AND ? GROUP BY local_date, section`,
    [from, to]
  );
  const map = new Map<string, Record<string, number>>();
  const put = (d: string, sec: string, m: number) => {
    const rec = map.get(d) ?? {};
    rec[sec || ""] = (rec[sec || ""] ?? 0) + m;
    map.set(d, rec);
  };
  for (const r of rows) put(r.local_date, r.section, Number(r.m));
  const open = await openSession();
  if (open && open.local_date >= from && open.local_date <= to) put(open.local_date, open.section, liveMinutes(open));
  return map;
}

const total = (rec: Record<string, number> | undefined) => (rec ? Object.values(rec).reduce((a, b) => a + b, 0) : 0);

export type Trends = {
  today: number;
  week: number;
  weekPlanned: number;
  last7: number;
  prev7: number;
  avg7: number;
  avg28: number;
  /** Least-squares slope of weekly hours over the last 6 full-or-current weeks, in hours/week per week. */
  slope: number;
  /** Over the last 14 days, study time on days with a plan ÷ the time planned for them (null with nothing planned). */
  adherence: number | null;
  streak: number;
  weeks: { start: string; bySection: Record<string, number>; total: number }[];
  heatmap: { date: string; minutes: number }[];
  /** Planned minutes per week (Monday date) over the same 12 weeks. */
  plannedWeeks: Record<string, number>;
};

/**
 * The study-time numbers for the dashboard and stats: today, this week vs
 * the plan, 7-day change, the multi-week trend, streak, and the daily heatmap.
 * All of it comes from logged study sessions (the "Start studying" button).
 */
export async function trends(settings: Settings, heatmapWeeks = 26): Promise<Trends> {
  const t = today(settings);
  const thisWeek = weekStart(t);
  const from = addDays(thisWeek, -7 * (Math.max(heatmapWeeks, 12) - 1));
  const byDay = await minutesByDay(from, t);
  const day = (d: string) => total(byDay.get(d));
  const sumRange = (a: string, b: string) => {
    let s = 0;
    for (let d = a; d <= b; d = addDays(d, 1)) s += day(d);
    return s;
  };

  const last7 = sumRange(addDays(t, -6), t);
  const prev7 = sumRange(addDays(t, -13), addDays(t, -7));
  const last28 = sumRange(addDays(t, -27), t);

  const weeks: Trends["weeks"] = [];
  for (let i = 11; i >= 0; i--) {
    const ws = addDays(thisWeek, -7 * i);
    const bySection: Record<string, number> = {};
    for (let d = ws; d <= addDays(ws, 6) && d <= t; d = addDays(d, 1)) {
      for (const [k, v] of Object.entries(byDay.get(d) ?? {})) bySection[k] = (bySection[k] ?? 0) + v;
    }
    weeks.push({ start: ws, bySection, total: total(bySection) });
  }

  // Trend over the last 6 weeks; the current week is projected to a full week so a Monday doesn't read as a collapse.
  const recent = weeks.slice(-6).map((w, i, arr) => {
    if (i < arr.length - 1) return w.total / 60;
    const elapsed = Math.min(7, Math.round((Date.parse(t) - Date.parse(w.start)) / 86_400_000) + 1);
    return (w.total / 60) * (7 / elapsed);
  });
  const firstActive = recent.findIndex((h) => h > 0);
  const series = firstActive === -1 ? [] : recent.slice(firstActive);
  let slope = 0;
  if (series.length >= 2) {
    const n = series.length;
    const mx = (n - 1) / 2;
    const my = series.reduce((a, b) => a + b, 0) / n;
    let num = 0;
    let den = 0;
    series.forEach((y, x) => {
      num += (x - mx) * (y - my);
      den += (x - mx) ** 2;
    });
    slope = den ? num / den : 0;
  }

  const planned = await all<{ date: string; m: number }>(
    `SELECT date, SUM(duration_min) AS m FROM tasks WHERE date BETWEEN ? AND ? AND kind NOT IN ('exam', 'rest') GROUP BY date`,
    [addDays(t, -13), addDays(thisWeek, 6)]
  );
  const plannedBetween = (a: string, b: string) => planned.filter((p) => p.date >= a && p.date <= b).reduce((s, p) => s + Number(p.m), 0);
  const planned14 = plannedBetween(addDays(t, -13), t);
  const studiedOnPlanned = planned.filter((p) => p.date >= addDays(t, -13) && p.date <= t).reduce((s, p) => s + day(p.date), 0);

  // Streak: consecutive days with study time or card reviews, counting back from today (or yesterday, if today hasn't started).
  const reviewDays = new Set(
    (await all<{ local_date: string }>("SELECT DISTINCT local_date FROM reviews WHERE local_date >= ?", [from])).map((r) => r.local_date)
  );
  const active = (d: string) => day(d) > 0 || reviewDays.has(d);
  let streak = 0;
  for (let d = active(t) ? t : addDays(t, -1); d >= from && active(d); d = addDays(d, -1)) streak++;

  const plannedWeeks: Record<string, number> = {};
  for (const r of await all<{ date: string; m: number }>(
    "SELECT date, SUM(duration_min) AS m FROM tasks WHERE date BETWEEN ? AND ? AND kind NOT IN ('exam', 'rest') GROUP BY date",
    [weeks[0].start, addDays(thisWeek, 6)]
  )) {
    const ws = weekStart(r.date);
    plannedWeeks[ws] = (plannedWeeks[ws] ?? 0) + Number(r.m);
  }

  const heatStart = addDays(thisWeek, -7 * (heatmapWeeks - 1));
  const heatmap: Trends["heatmap"] = [];
  for (let d = heatStart; d <= addDays(thisWeek, 6); d = addDays(d, 1)) heatmap.push({ date: d, minutes: d <= t ? day(d) : -1 });

  return {
    today: day(t),
    week: sumRange(thisWeek, t),
    weekPlanned: plannedBetween(thisWeek, addDays(thisWeek, 6)),
    last7,
    prev7,
    avg7: last7 / 7,
    avg28: last28 / 28,
    slope,
    adherence: planned14 ? studiedOnPlanned / planned14 : null,
    streak,
    weeks,
    heatmap,
    plannedWeeks,
  };
}

// ─── Flashcards ─────────────────────────────────────────────────

export async function cardCounts(settings: Settings, deckId?: number) {
  const now = new Date().toISOString();
  const t = today(settings);
  const deck = deckId ? " AND deck_id = ?" : "";
  const args = deckId ? [deckId] : [];
  const due = await one<{ n: number }>(`SELECT COUNT(*) AS n FROM cards WHERE suspended = 0 AND state != 0 AND due <= ?${deck}`, [now, ...args]);
  const fresh = await one<{ n: number }>(`SELECT COUNT(*) AS n FROM cards WHERE suspended = 0 AND state = 0${deck}`, args);
  const introduced = await one<{ n: number }>("SELECT COUNT(*) AS n FROM reviews WHERE prev_state = 0 AND local_date = ?", [t]);
  const reviewed = await one<{ n: number }>("SELECT COUNT(*) AS n FROM reviews WHERE local_date = ?", [t]);
  const newLeft = Math.max(0, settings.new_per_day - Number(introduced?.n ?? 0));
  return {
    due: Math.min(Number(due?.n ?? 0), settings.max_reviews),
    newAvailable: Math.min(Number(fresh?.n ?? 0), newLeft),
    newTotal: Number(fresh?.n ?? 0),
    reviewedToday: Number(reviewed?.n ?? 0),
  };
}

/** Share of review-state cards (not learning) recalled, over the last 30 days. */
export async function retention30(settings: Settings): Promise<number | null> {
  const r = await one<{ n: number; ok: number }>(
    "SELECT COUNT(*) AS n, SUM(rating > 1) AS ok FROM reviews WHERE prev_state = 2 AND local_date >= ?",
    [addDays(today(settings), -29)]
  );
  return r && Number(r.n) ? Number(r.ok) / Number(r.n) : null;
}

// ─── Plan ───────────────────────────────────────────────────────

export async function tasksBetween(from: string, to: string): Promise<Task[]> {
  return all<Task>("SELECT * FROM tasks WHERE date BETWEEN ? AND ? ORDER BY date, COALESCE(start_min, 9999), id", [from, to]);
}

/**
 * Rebuilds the plan from today: generated tasks that aren't done (including
 * missed ones in the past, whose topics go back in the queue) are replaced;
 * done tasks and tasks added by hand stay. Missed hand-added tasks move to today.
 */
export async function regeneratePlan(): Promise<number> {
  const settings = await getSettings();
  const t = today(settings);
  const ratings = await all<{ topic_id: string; confidence: number; content_done: number }>("SELECT * FROM topic_ratings");
  const doneTopics = new Set(ratings.filter((r) => r.content_done).map((r) => r.topic_id));
  // A topic's content review is done once every content block for it is (a topic can be split over days).
  for (const r of await all<{ topic_id: string }>(
    `SELECT topic_id FROM tasks WHERE kind = 'content' AND topic_id IS NOT NULL
     GROUP BY topic_id HAVING MIN(done) = 1`
  )) {
    doneTopics.add(r.topic_id);
  }
  // Topics already on a hand-moved block stay where they were put.
  for (const r of await all<{ topic_id: string }>("SELECT DISTINCT topic_id FROM tasks WHERE kind = 'content' AND auto = 0 AND done = 0 AND topic_id IS NOT NULL")) {
    doneTopics.add(r.topic_id);
  }
  // Done full-length tasks and logged full-length scores are often the same exams; count the larger.
  const flTasks = await one<{ n: number }>("SELECT COUNT(*) AS n FROM tasks WHERE kind = 'full_length' AND done = 1");
  const flExams = await one<{ n: number }>("SELECT COUNT(*) AS n FROM exams WHERE kind = 'full_length'");
  const plan = buildPlan({
    settings,
    today: t,
    confidence: Object.fromEntries(ratings.map((r) => [r.topic_id, Number(r.confidence)])),
    doneTopics,
    fullLengthsTaken: Math.max(Number(flTasks?.n ?? 0), Number(flExams?.n ?? 0)),
  });
  const db = await getDb();
  await db.batch(
    [
      { sql: "DELETE FROM tasks WHERE auto = 1 AND done = 0", args: [] },
      { sql: "UPDATE tasks SET date = ? WHERE auto = 0 AND done = 0 AND date < ?", args: [t, t] },
      ...plan.map((p) => ({
        sql: `INSERT INTO tasks (date, start_min, duration_min, title, kind, section, topic_id, notes, auto) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        args: [p.date, p.start_min, p.duration_min, p.title, p.kind, p.section, p.topic_id, p.notes],
      })),
    ],
    "write"
  );
  return plan.length;
}

export async function missedCount(settings: Settings): Promise<number> {
  const r = await one<{ n: number }>("SELECT COUNT(*) AS n FROM tasks WHERE done = 0 AND date < ? AND kind NOT IN ('exam', 'rest')", [today(settings)]);
  return Number(r?.n ?? 0);
}
