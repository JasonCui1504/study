import type { Grade } from "ts-fsrs";
import { all, getDb, one } from "../../../lib/db";
import { FSRS_FIELDS, fsrsValues, previews, scheduler, toFsrs, type CardRow } from "../../../lib/cards";
import { cardCounts, today } from "../../../lib/queries";
import { bad, body, HttpError, id, int, route } from "../../../lib/route";
import { TOPICS } from "../../../lib/outline";
import { SECTION_IDS } from "../../../lib/sections";
import { getSettings } from "../../../lib/settings";

// GET: a batch of cards to study. Modes:
//   due        – cards due now, then today's new cards (the normal daily review)
//   struggling – cards you've lapsed on or graded Again lately (reschedules normally)
//   cram       – any matching cards in random order; grades don't change scheduling
// Filters: deck, section, topic (a topic id or category prefix like "1D").
// POST: grade a card. Returns its next due time so the client can re-show learning steps.

export const GET = route(async (request) => {
  const q = request.nextUrl.searchParams;
  const settings = await getSettings();
  const mode = q.get("mode") ?? "due";
  const where = ["c.suspended = 0"];
  const args: (string | number)[] = [];
  const deck = q.get("deck");
  if (deck) {
    where.push("c.deck_id = ?");
    args.push(id(deck));
  }
  const section = q.get("section");
  if (section && SECTION_IDS.includes(section)) {
    // The deck's section, or a card tagged with a topic in that section.
    const ids = TOPICS.filter((t) => t.section === section).map((t) => t.id);
    where.push(`(d.section = ? OR c.topic_id IN (${ids.map(() => "?").join(", ")}))`);
    args.push(section, ...ids);
  }
  const topic = q.get("topic");
  if (topic && /^[\w.]+$/.test(topic)) {
    where.push("(c.topic_id = ? OR c.topic_id LIKE ?)");
    args.push(topic, `${topic}.%`);
  }
  const base = `SELECT c.*, d.name AS deck_name FROM cards c JOIN decks d ON d.id = c.deck_id WHERE ${where.join(" AND ")}`;
  const now = new Date().toISOString();
  let rows: (CardRow & { deck_name: string })[];

  if (mode === "cram") {
    rows = await all(`${base} ORDER BY RANDOM() LIMIT ?`, [...args, Math.min(200, int(q.get("limit"), 50)!)]);
  } else if (mode === "struggling") {
    rows = await all(
      `${base} AND c.state != 0 AND (c.lapses > 0 OR c.id IN (SELECT card_id FROM reviews WHERE rating = 1 AND local_date >= date('now', '-14 days')))
       ORDER BY c.lapses DESC, c.difficulty DESC LIMIT 100`,
      args
    );
  } else {
    const counts = await cardCounts(settings);
    const reviewedOld = await one<{ n: number }>("SELECT COUNT(*) AS n FROM reviews WHERE prev_state != 0 AND local_date = ?", [today(settings)]);
    const reviewLimit = Math.max(0, settings.max_reviews - Number(reviewedOld?.n ?? 0));
    const due = await all<CardRow & { deck_name: string }>(`${base} AND c.state != 0 AND c.due <= ? ORDER BY c.due LIMIT ?`, [...args, now, reviewLimit]);
    const fresh = await all<CardRow & { deck_name: string }>(`${base} AND c.state = 0 ORDER BY c.id LIMIT ?`, [...args, counts.newAvailable]);
    // Spread new cards through the reviews rather than saving them all for the end.
    rows = [];
    const every = fresh.length ? Math.max(1, Math.floor(due.length / fresh.length)) : 0;
    let f = 0;
    due.forEach((c, i) => {
      rows.push(c);
      if (every && (i + 1) % every === 0 && f < fresh.length) rows.push(fresh[f++]);
    });
    rows.push(...fresh.slice(f));
  }

  return {
    mode,
    cards: rows.map((c) => ({
      id: c.id,
      kind: c.kind,
      front: c.front,
      back: c.back,
      extra: c.extra,
      cloze_index: c.cloze_index,
      topic_id: c.topic_id,
      deck_name: c.deck_name,
      state: c.state,
      flagged: c.flagged,
      previews: previews(c, settings.retention),
    })),
  };
});

export const POST = route(async (request) => {
  const b = await body(request);
  const cardId = id(b.card_id);
  const rating = int(b.rating);
  if (rating == null || rating < 1 || rating > 4) throw bad("rating must be 1–4");
  const card = await one<CardRow>("SELECT * FROM cards WHERE id = ?", [cardId]);
  if (!card) throw new HttpError(404, "Card not found");
  const settings = await getSettings();
  const now = new Date();
  const next = scheduler(settings.retention).next(toFsrs(card), now, rating as Grade).card;
  const prev = Object.fromEntries(FSRS_FIELDS.map((f) => [f, card[f]]));
  const db = await getDb();
  await db.batch(
    [
      { sql: `UPDATE cards SET ${FSRS_FIELDS.map((f) => `${f} = ?`).join(", ")} WHERE id = ?`, args: [...fsrsValues(next), cardId] },
      {
        sql: "INSERT INTO reviews (card_id, rating, prev_state, duration_ms, reviewed_at, local_date, prev) VALUES (?, ?, ?, ?, ?, ?, ?)",
        args: [cardId, rating, card.state, Math.min(600_000, Math.max(0, int(b.duration_ms, 0)!)), now.toISOString(), today(settings, now), JSON.stringify(prev)],
      },
    ],
    "write"
  );
  const updated = { ...card, ...Object.fromEntries(FSRS_FIELDS.map((f, i) => [f, fsrsValues(next)[i]])) } as CardRow;
  return { due: next.due.toISOString(), state: next.state, previews: previews(updated, settings.retention) };
});
