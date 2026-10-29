import { run } from "../../../lib/db";
import { bad, body, route, str } from "../../../lib/route";
import { SECTION_IDS } from "../../../lib/sections";

export const POST = route(async (request) => {
  const b = await body(request);
  const title = str(b.title);
  if (!title) throw bad("A title is required");
  const rs = await run("INSERT INTO books (title, section, sort) VALUES (?, ?, (SELECT COALESCE(MAX(sort), -1) + 1 FROM books)) RETURNING id", [
    title,
    SECTION_IDS.includes(str(b.section)) ? str(b.section) : "",
  ]);
  return Response.json({ id: Number(rs.rows[0].id) }, { status: 201 });
});
