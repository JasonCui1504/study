import { one, run } from "../../../../lib/db";
import { clozeNumbers, newCardValues, FSRS_FIELDS, type CardRow } from "../../../../lib/cards";
import { topic } from "../../../../lib/outline";
import { bad, body, HttpError, id, route, str } from "../../../../lib/route";

export const PATCH = route<{ id: string }>(async (request, p) => {
  const cardId = id(p.id);
  const card = await one<CardRow>("SELECT * FROM cards WHERE id = ?", [cardId]);
  if (!card) throw new HttpError(404, "Not found");
  const b = await body(request);
  const sets: string[] = [];
  const args: (string | number | null)[] = [];
  const set = (col: string, v: string | number | null) => {
    sets.push(`${col} = ?`);
    args.push(v);
  };
  if ("front" in b) {
    const front = str(b.front);
    if (!front) throw bad("The front is required");
    // A cloze card has to keep its own cloze number.
    if (card.kind === "cloze" && !clozeNumbers(front).includes(card.cloze_index)) {
      throw bad(`This card is cloze c${card.cloze_index}; keep a {{c${card.cloze_index}::…}} in the text`);
    }
    set("front", front);
  }
  if ("back" in b) set("back", str(b.back));
  if ("extra" in b) set("extra", str(b.extra));
  if ("tags" in b) set("tags", str(b.tags));
  if ("topic_id" in b) set("topic_id", topic(str(b.topic_id))?.id ?? null);
  if ("deck_id" in b) set("deck_id", id(b.deck_id));
  if ("suspended" in b) set("suspended", b.suspended ? 1 : 0);
  if ("flagged" in b) set("flagged", b.flagged ? 1 : 0);
  if (b.reset) FSRS_FIELDS.forEach((f, i) => set(f, newCardValues()[i]));
  if (sets.length) await run(`UPDATE cards SET ${sets.join(", ")} WHERE id = ?`, [...args, cardId]);
  return { ok: true };
});

export const DELETE = route<{ id: string }>(async (_request, p) => {
  await run("DELETE FROM cards WHERE id = ?", [id(p.id)]);
  return { ok: true };
});
