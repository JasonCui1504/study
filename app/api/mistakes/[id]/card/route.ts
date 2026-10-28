import { addCards } from "../../../../../lib/card-store";
import { one, run } from "../../../../../lib/db";
import { bad, body, HttpError, id, route, str } from "../../../../../lib/route";

const DECK = "Mistakes";

/** Turns a mistake into a flashcard in the "Mistakes" deck (created on first use). */
export const POST = route<{ id: string }>(async (request, p) => {
  const mid = id(p.id);
  const m = await one<{ id: number; topic_id: string | null; section: string }>("SELECT id, topic_id, section FROM mistakes WHERE id = ?", [mid]);
  if (!m) throw new HttpError(404, "Not found");
  const b = await body(request);
  if (!str(b.front)) throw bad("The front is required");
  let deck = await one<{ id: number }>("SELECT id FROM decks WHERE name = ?", [DECK]);
  if (!deck) {
    const rs = await run("INSERT INTO decks (name, description) VALUES (?, ?) RETURNING id", [DECK, "Cards made from the mistake log."]);
    deck = { id: Number(rs.rows[0].id) };
  }
  const [cardId] = await addCards(deck.id, [{ front: str(b.front), back: str(b.back), topic_id: m.topic_id, tags: "mistake" }]);
  await run("UPDATE mistakes SET card_id = ? WHERE id = ?", [cardId ?? null, mid]);
  return Response.json({ card_id: cardId, deck_id: deck.id }, { status: 201 });
});
