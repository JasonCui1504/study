import { one, run } from "../../../../lib/db";
import { topic } from "../../../../lib/outline";
import { liveMinutes, type StudySession } from "../../../../lib/queries";
import { body, HttpError, id, int, route, str } from "../../../../lib/route";
import { SECTION_IDS } from "../../../../lib/sections";

const MAX_MIN = 16 * 60;

// PATCH with `end` stops an open session and records its minutes (or the
// `minutes` given, e.g. after forgetting to stop it). Without `end` it edits
// a session's details. `task_done` also ticks off the task it was started from.
export const PATCH = route<{ id: string }>(async (request, p) => {
  const sid = id(p.id);
  const s = await one<StudySession>("SELECT * FROM sessions WHERE id = ?", [sid]);
  if (!s) throw new HttpError(404, "Not found");
  const b = await body(request);
  const sets: string[] = [];
  const args: (string | number | null)[] = [];
  const set = (col: string, v: string | number | null) => {
    sets.push(`${col} = ?`);
    args.push(v);
  };
  if ("section" in b) set("section", SECTION_IDS.includes(str(b.section)) ? str(b.section) : "");
  if ("topic_id" in b) set("topic_id", topic(str(b.topic_id))?.id ?? null);
  if ("notes" in b) set("notes", str(b.notes));
  const given = int(b.minutes);
  if (b.end && !s.ended_at) {
    const minutes = Math.min(MAX_MIN, Math.max(0, given ?? liveMinutes(s)));
    if (minutes === 0) {
      // Nothing to record (started by mistake, or under a minute).
      await run("DELETE FROM sessions WHERE id = ?", [sid]);
      if (b.task_done && s.task_id) await run("UPDATE tasks SET done = 1 WHERE id = ?", [s.task_id]);
      return { ok: true, discarded: true };
    }
    set("ended_at", new Date().toISOString());
    set("minutes", minutes);
  } else if (given != null && s.ended_at) {
    set("minutes", Math.min(MAX_MIN, Math.max(0, given)));
  }
  if (sets.length) await run(`UPDATE sessions SET ${sets.join(", ")} WHERE id = ?`, [...args, sid]);
  if (b.task_done && s.task_id) await run("UPDATE tasks SET done = 1 WHERE id = ?", [s.task_id]);
  return { ok: true };
});

export const DELETE = route<{ id: string }>(async (_request, p) => {
  await run("DELETE FROM sessions WHERE id = ?", [id(p.id)]);
  return { ok: true };
});
