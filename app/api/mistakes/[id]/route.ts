import { run } from "../../../../lib/db";
import { mistakeFields } from "../../../../lib/mistake-fields";
import { body, id, route } from "../../../../lib/route";

export const PATCH = route<{ id: string }>(async (request, p) => {
  const f = mistakeFields(await body(request));
  await run("UPDATE mistakes SET date = ?, source = ?, section = ?, topic_id = ?, reason = ?, question = ?, takeaway = ? WHERE id = ?", [
    f.date,
    f.source,
    f.section,
    f.topic_id,
    f.reason,
    f.question,
    f.takeaway,
    id(p.id),
  ]);
  return { ok: true };
});

export const DELETE = route<{ id: string }>(async (_request, p) => {
  await run("DELETE FROM mistakes WHERE id = ?", [id(p.id)]);
  return { ok: true };
});
