import { run } from "../../../../lib/db";
import { examFields } from "../../../../lib/exam-fields";
import { body, id, route } from "../../../../lib/route";

export const PATCH = route<{ id: string }>(async (request, p) => {
  const f = examFields(await body(request));
  await run("UPDATE exams SET date = ?, name = ?, kind = ?, cp = ?, cars = ?, bb = ?, ps = ?, reviewed = ?, notes = ? WHERE id = ?", [
    f.date,
    f.name,
    f.kind,
    f.cp,
    f.cars,
    f.bb,
    f.ps,
    f.reviewed,
    f.notes,
    id(p.id),
  ]);
  return { ok: true };
});

export const DELETE = route<{ id: string }>(async (_request, p) => {
  await run("DELETE FROM exams WHERE id = ?", [id(p.id)]);
  return { ok: true };
});
