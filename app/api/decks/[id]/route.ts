import { run } from "../../../../lib/db";
import { bad, body, id, route, str } from "../../../../lib/route";
import { SECTION_IDS } from "../../../../lib/sections";

export const PATCH = route<{ id: string }>(async (request, p) => {
  const b = await body(request);
  const name = str(b.name);
  if (!name) throw bad("A deck name is required");
  await run("UPDATE decks SET name = ?, section = ?, description = ? WHERE id = ?", [
    name,
    SECTION_IDS.includes(str(b.section)) ? str(b.section) : "",
    str(b.description),
    id(p.id),
  ]);
  return { ok: true };
});

export const DELETE = route<{ id: string }>(async (_request, p) => {
  const deckId = id(p.id);
  await run("DELETE FROM cards WHERE deck_id = ?", [deckId]);
  await run("DELETE FROM decks WHERE id = ?", [deckId]);
  return { ok: true };
});
