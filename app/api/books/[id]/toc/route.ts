import { addToc } from "../../../../../lib/books";
import { one } from "../../../../../lib/db";
import { bad, body, HttpError, id, route } from "../../../../../lib/route";
import { parseToc } from "../../../../../lib/toc";

/** Adds chapters and sections from a pasted table of contents (see lib/toc.ts). */
export const POST = route<{ id: string }>(async (request, p) => {
  const bookId = id(p.id);
  if (!(await one("SELECT id FROM books WHERE id = ?", [bookId]))) throw new HttpError(404, "Book not found");
  const b = await body(request);
  const text = typeof b.text === "string" ? b.text : "";
  if (text.length > 200_000) throw bad("That's too long");
  const toc = parseToc(text);
  if (!toc.length) throw bad("Paste at least one chapter");
  if (toc.length > 200) throw bad("That's more than 200 chapters. Check the format.");
  return addToc(bookId, toc);
});
