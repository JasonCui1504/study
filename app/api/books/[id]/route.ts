import { run } from "../../../../lib/db";
import { bad, body, id, route, str } from "../../../../lib/route";
import { SECTION_IDS } from "../../../../lib/sections";

export const PATCH = route<{ id: string }>(async (request, p) => {
  const b = await body(request);
  const title = str(b.title);
  if (!title) throw bad("A title is required");
  await run("UPDATE books SET title = ?, section = ? WHERE id = ?", [title, SECTION_IDS.includes(str(b.section)) ? str(b.section) : "", id(p.id)]);
  return { ok: true };
});

export const DELETE = route<{ id: string }>(async (_request, p) => {
  const bookId = id(p.id);
  // Explicit, since remote libSQL connections may not enforce ON DELETE CASCADE.
  await run("DELETE FROM book_sections WHERE chapter_id IN (SELECT id FROM chapters WHERE book_id = ?)", [bookId]);
  await run("DELETE FROM chapters WHERE book_id = ?", [bookId]);
  await run("DELETE FROM books WHERE id = ?", [bookId]);
  return { ok: true };
});
