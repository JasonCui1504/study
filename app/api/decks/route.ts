import { run } from "../../../lib/db";
import { bad, body, route, str } from "../../../lib/route";
import { SECTION_IDS } from "../../../lib/sections";

export const POST = route(async (request) => {
  const b = await body(request);
  const name = str(b.name);
  if (!name) throw bad("A deck name is required");
  const rs = await run("INSERT INTO decks (name, section, description) VALUES (?, ?, ?) RETURNING id", [
    name,
    SECTION_IDS.includes(str(b.section)) ? str(b.section) : "",
    str(b.description),
  ]);
  return Response.json({ id: Number(rs.rows[0].id) }, { status: 201 });
});
