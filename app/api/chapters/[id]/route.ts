import { isBookStatus } from "../../../../lib/book-status";
import { run } from "../../../../lib/db";
import { bad, body, id, route, str } from "../../../../lib/route";

// `status` with `cascade` also sets every section of the chapter (e.g. marking
// a whole chapter mastered crosses off its sections too).
export const PATCH = route<{ id: string }>(async (request, p) => {
  const chapterId = id(p.id);
  const b = await body(request);
  const sets: string[] = [];
  const args: (string | number)[] = [];
  if ("title" in b) {
    if (!str(b.title)) throw bad("A title is required");
    sets.push("title = ?");
    args.push(str(b.title));
  }
  if ("number" in b) {
    sets.push("number = ?");
    args.push(str(b.number));
  }
  if ("notes" in b) {
    sets.push("notes = ?");
    args.push(str(b.notes));
  }
  if ("status" in b) {
    if (!isBookStatus(b.status)) throw bad("Unknown status");
    sets.push("status = ?");
    args.push(b.status);
    if (b.cascade) await run("UPDATE book_sections SET status = ?, updated_at = datetime('now') WHERE chapter_id = ?", [b.status, chapterId]);
  }
  if (sets.length) await run(`UPDATE chapters SET ${sets.join(", ")}, updated_at = datetime('now') WHERE id = ?`, [...args, chapterId]);
  return { ok: true };
});

export const DELETE = route<{ id: string }>(async (_request, p) => {
  const chapterId = id(p.id);
  await run("DELETE FROM book_sections WHERE chapter_id = ?", [chapterId]);
  await run("DELETE FROM chapters WHERE id = ?", [chapterId]);
  return { ok: true };
});
