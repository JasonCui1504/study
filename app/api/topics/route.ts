import { run } from "../../../lib/db";
import { topic } from "../../../lib/outline";
import { bad, body, int, route, str } from "../../../lib/route";

/** Sets a topic's confidence (0–5), content-done flag and/or notes. */
export const PATCH = route(async (request) => {
  const b = await body(request);
  const t = topic(str(b.topic_id));
  if (!t) throw bad("Unknown topic");
  const confidence = "confidence" in b ? Math.min(5, Math.max(0, int(b.confidence, 0)!)) : null;
  await run(
    `INSERT INTO topic_ratings (topic_id, confidence, content_done, notes) VALUES (?, COALESCE(?, 0), COALESCE(?, 0), COALESCE(?, ''))
     ON CONFLICT(topic_id) DO UPDATE SET
       confidence = COALESCE(?, confidence),
       content_done = COALESCE(?, content_done),
       notes = COALESCE(?, notes),
       updated_at = datetime('now')`,
    (() => {
      const vals = [confidence, "content_done" in b ? (b.content_done ? 1 : 0) : null, "notes" in b ? str(b.notes) : null];
      return [t.id, ...vals, ...vals];
    })()
  );
  return { ok: true };
});
