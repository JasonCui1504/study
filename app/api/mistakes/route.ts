import { run } from "../../../lib/db";
import { mistakeFields } from "../../../lib/mistake-fields";
import { bad, body, route } from "../../../lib/route";

export const POST = route(async (request) => {
  const f = mistakeFields(await body(request));
  if (!f.question && !f.takeaway) throw bad("Describe the question or the takeaway");
  const rs = await run(
    "INSERT INTO mistakes (date, source, section, topic_id, reason, question, takeaway) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id",
    [f.date, f.source, f.section, f.topic_id, f.reason, f.question, f.takeaway]
  );
  return Response.json({ id: Number(rs.rows[0].id) }, { status: 201 });
});
