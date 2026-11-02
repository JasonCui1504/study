import { getDb, one } from "./db";
import { clozeNumbers, FSRS_FIELDS, newCardValues } from "./cards";
import { topic } from "./outline";
import { HttpError } from "./route";

export type NewCard = { front: string; back?: string; extra?: string; topic_id?: string | null; tags?: string };

/**
 * Adds notes to a deck. A note with {{c1::…}} clozes becomes one card per
 * cloze number; anything else is a front/back card. Returns the card ids.
 */
export async function addCards(deckId: number, notes: NewCard[]): Promise<number[]> {
  if (!(await one("SELECT id FROM decks WHERE id = ?", [deckId]))) throw new HttpError(404, "Deck not found");
  const fsrs = newCardValues();
  const cols = `deck_id, kind, front, back, extra, cloze_index, topic_id, tags, ${FSRS_FIELDS.join(", ")}`;
  const marks = Array(8 + FSRS_FIELDS.length).fill("?").join(", ");
  const stmts = [];
  for (const n of notes) {
    const front = n.front.trim();
    if (!front) continue;
    const topicId = topic(n.topic_id ?? null)?.id ?? null;
    const tags = (n.tags ?? "").trim();
    const nums = clozeNumbers(front);
    const rows: [string, number][] = nums.length ? nums.map((c) => ["cloze", c]) : [["basic", 0]];
    for (const [kind, idx] of rows) {
      stmts.push({
        sql: `INSERT INTO cards (${cols}) VALUES (${marks}) RETURNING id`,
        args: [deckId, kind, front, (n.back ?? "").trim(), (n.extra ?? "").trim(), idx, topicId, tags, ...fsrs],
      });
    }
  }
  if (!stmts.length) return [];
  const db = await getDb();
  const results = await db.batch(stmts, "write");
  return results.map((r) => Number(r.rows[0].id));
}
