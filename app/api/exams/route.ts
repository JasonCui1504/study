import { run } from "../../../lib/db";
import { examFields } from "../../../lib/exam-fields";
import { body, route } from "../../../lib/route";

export const POST = route(async (request) => {
  const f = examFields(await body(request));
  const rs = await run(
    "INSERT INTO exams (date, name, kind, cp, cars, bb, ps, reviewed, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id",
    [f.date, f.name, f.kind, f.cp, f.cars, f.bb, f.ps, f.reviewed, f.notes]
  );
  return Response.json({ id: Number(rs.rows[0].id) }, { status: 201 });
});
