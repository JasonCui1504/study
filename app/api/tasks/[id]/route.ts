import { one, run } from "../../../../lib/db";
import { topic } from "../../../../lib/outline";
import { TASK_KINDS } from "../../../../lib/planner";
import type { Task } from "../../../../lib/queries";
import { bad, body, DATE, HttpError, id, int, route, str } from "../../../../lib/route";
import { SECTION_IDS } from "../../../../lib/sections";

export const PATCH = route<{ id: string }>(async (request, p) => {
  const taskId = id(p.id);
  const task = await one<Task>("SELECT * FROM tasks WHERE id = ?", [taskId]);
  if (!task) throw new HttpError(404, "Not found");
  const b = await body(request);
  const sets: string[] = [];
  const args: (string | number | null)[] = [];
  const set = (col: string, v: string | number | null) => {
    sets.push(`${col} = ?`);
    args.push(v);
  };
  if ("title" in b) {
    if (!str(b.title)) throw bad("A title is required");
    set("title", str(b.title));
  }
  if ("date" in b) {
    if (!DATE.test(str(b.date))) throw bad("Invalid date");
    set("date", str(b.date));
  }
  if ("start_min" in b) {
    const v = int(b.start_min);
    set("start_min", v == null ? null : Math.min(1439, Math.max(0, v)));
  }
  if ("duration_min" in b) set("duration_min", Math.min(720, Math.max(5, int(b.duration_min, 60)!)));
  if ("kind" in b && (TASK_KINDS as readonly string[]).includes(str(b.kind))) set("kind", str(b.kind));
  if ("section" in b) set("section", SECTION_IDS.includes(str(b.section)) ? str(b.section) : "");
  if ("topic_id" in b) set("topic_id", topic(str(b.topic_id))?.id ?? null);
  if ("notes" in b) set("notes", str(b.notes));
  if ("done" in b) set("done", b.done ? 1 : 0);
  // Moving or editing a generated task by hand keeps it through plan rebuilds.
  if (["title", "date", "start_min", "duration_min"].some((k) => k in b)) set("auto", 0);
  if (!sets.length) return { ok: true };
  await run(`UPDATE tasks SET ${sets.join(", ")} WHERE id = ?`, [...args, taskId]);
  return { ok: true };
});

export const DELETE = route<{ id: string }>(async (_request, p) => {
  await run("DELETE FROM tasks WHERE id = ?", [id(p.id)]);
  return { ok: true };
});
