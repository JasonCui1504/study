import { run } from "../../../lib/db";
import { TASK_KINDS } from "../../../lib/planner";
import { tasksBetween } from "../../../lib/queries";
import { bad, body, DATE, int, route, str } from "../../../lib/route";
import { SECTION_IDS } from "../../../lib/sections";
import { topic } from "../../../lib/outline";

export const GET = route(async (request) => {
  const from = request.nextUrl.searchParams.get("from") ?? "";
  const to = request.nextUrl.searchParams.get("to") ?? "";
  if (!DATE.test(from) || !DATE.test(to)) throw bad("from and to dates are required");
  return tasksBetween(from, to);
});

export const POST = route(async (request) => {
  const b = await body(request);
  const title = str(b.title);
  if (!title) throw bad("A title is required");
  if (!DATE.test(str(b.date))) throw bad("A date is required");
  const kind = (TASK_KINDS as readonly string[]).includes(str(b.kind)) ? str(b.kind) : "custom";
  const section = SECTION_IDS.includes(str(b.section)) ? str(b.section) : "";
  const start = int(b.start_min);
  const rs = await run(
    `INSERT INTO tasks (date, start_min, duration_min, title, kind, section, topic_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    [
      str(b.date),
      start == null ? null : Math.min(1439, Math.max(0, start)),
      Math.min(720, Math.max(5, int(b.duration_min, 60)!)),
      title,
      kind,
      section,
      topic(str(b.topic_id))?.id ?? null,
      str(b.notes),
    ]
  );
  return Response.json({ id: Number(rs.rows[0].id) }, { status: 201 });
});
