import { one, run } from "../../../lib/db";
import { topic } from "../../../lib/outline";
import { openSession, today, type StudySession } from "../../../lib/queries";
import { bad, body, DATE, int, route, str } from "../../../lib/route";
import { SECTION_IDS } from "../../../lib/sections";
import { getSettings } from "../../../lib/settings";

// POST starts a study session (the dashboard's "Start studying"), or with
// `manual` logs time after the fact. Only one session can be open; starting
// while one is open returns that one.

export const GET = route(async () => ({ open: await openSession() }));

export const POST = route(async (request) => {
  const b = await body(request);
  const settings = await getSettings();
  const section = SECTION_IDS.includes(str(b.section)) ? str(b.section) : "";
  const topicId = topic(str(b.topic_id))?.id ?? null;
  const taskId = int(b.task_id);
  if (b.manual) {
    const date = str(b.date);
    const minutes = int(b.minutes);
    if (!DATE.test(date)) throw bad("A date is required");
    if (!minutes || minutes < 1 || minutes > 16 * 60) throw bad("Minutes must be between 1 and 960");
    if (date > today(settings)) throw bad("That date is in the future");
    const now = new Date().toISOString();
    const rs = await run(
      "INSERT INTO sessions (started_at, ended_at, local_date, minutes, section, topic_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id",
      [now, now, date, minutes, section, topicId, str(b.notes)]
    );
    return Response.json({ id: Number(rs.rows[0].id) }, { status: 201 });
  }
  const open = await openSession();
  if (open) return { session: open };
  const now = new Date();
  await run("INSERT INTO sessions (started_at, local_date, section, topic_id, task_id, notes) VALUES (?, ?, ?, ?, ?, ?)", [
    now.toISOString(),
    today(settings, now),
    section,
    topicId,
    taskId,
    str(b.notes),
  ]);
  return Response.json({ session: await one<StudySession>("SELECT * FROM sessions WHERE ended_at IS NULL ORDER BY id DESC LIMIT 1") }, { status: 201 });
});
