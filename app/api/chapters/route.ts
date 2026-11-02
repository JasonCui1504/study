import { one, run } from "../../../lib/db";
import { bad, body, HttpError, id, route, str } from "../../../lib/route";

export const POST = route(async (request) => {
  const b = await body(request);
  const bookId = id(b.book_id);
  const title = str(b.title);
  if (!title) throw bad("A title is required");
  if (!(await one("SELECT id FROM books WHERE id = ?", [bookId]))) throw new HttpError(404, "Book not found");
  const rs = await run(
    "INSERT INTO chapters (book_id, number, title, sort) VALUES (?, ?, ?, (SELECT COALESCE(MAX(sort), -1) + 1 FROM chapters WHERE book_id = ?)) RETURNING id",
    [bookId, str(b.number), title, bookId]
  );
  return Response.json({ id: Number(rs.rows[0].id) }, { status: 201 });
});
