import { isBookStatus } from "../../../../lib/book-status";
import { syncChapter } from "../../../../lib/books";
import { one, run } from "../../../../lib/db";
import { bad, body, HttpError, id, route, str } from "../../../../lib/route";

/** Edits a section; a status change rolls up into its chapter (see syncChapter). Returns the chapter's status. */
export const PATCH = route<{ id: string }>(async (request, p) => {
  const sectionId = id(p.id);
  const sec = await one<{ chapter_id: number }>("SELECT chapter_id FROM book_sections WHERE id = ?", [sectionId]);
  if (!sec) throw new HttpError(404, "Not found");
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
  if ("status" in b) {
    if (!isBookStatus(b.status)) throw bad("Unknown status");
    sets.push("status = ?");
    args.push(b.status);
  }
  if (sets.length) await run(`UPDATE book_sections SET ${sets.join(", ")}, updated_at = datetime('now') WHERE id = ?`, [...args, sectionId]);
  await syncChapter(sec.chapter_id);
  const ch = await one<{ status: string }>("SELECT status FROM chapters WHERE id = ?", [sec.chapter_id]);
  return { chapter_status: ch?.status };
});

export const DELETE = route<{ id: string }>(async (_request, p) => {
  const sectionId = id(p.id);
  const sec = await one<{ chapter_id: number }>("SELECT chapter_id FROM book_sections WHERE id = ?", [sectionId]);
  await run("DELETE FROM book_sections WHERE id = ?", [sectionId]);
  if (sec) await syncChapter(sec.chapter_id);
  return { ok: true };
});
