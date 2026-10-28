import { getDb, one } from "../../../../lib/db";
import { FSRS_FIELDS } from "../../../../lib/cards";
import { HttpError, route } from "../../../../lib/route";

/** Takes back the most recent grade: the card's previous state is restored and the review forgotten. */
export const POST = route(async () => {
  const last = await one<{ id: number; card_id: number; prev: string }>("SELECT id, card_id, prev FROM reviews ORDER BY id DESC LIMIT 1");
  if (!last) throw new HttpError(404, "Nothing to undo");
  const prev = JSON.parse(last.prev) as Record<string, string | number | null>;
  const db = await getDb();
  await db.batch(
    [
      { sql: `UPDATE cards SET ${FSRS_FIELDS.map((f) => `${f} = ?`).join(", ")} WHERE id = ?`, args: [...FSRS_FIELDS.map((f) => prev[f] ?? null), last.card_id] },
      { sql: "DELETE FROM reviews WHERE id = ?", args: [last.id] },
    ],
    "write"
  );
  return { card_id: last.card_id };
});
