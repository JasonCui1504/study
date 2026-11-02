import { syncChapter } from "../../../lib/books";
import { one, run } from "../../../lib/db";
import { bad, body, HttpError, id, route, str } from "../../../lib/route";

export const POST = route(async (request) => {
  const b = await body(request);
  const chapterId = id(b.chapter_id);
  const title = str(b.title);
  if (!title) throw bad("A title is required");
  if (!(await one("SELECT id FROM chapters WHERE id = ?", [chapterId]))) throw new HttpError(404, "Chapter not found");
  const rs = await run(
    "INSERT INTO book_sections (chapter_id, number, title, sort) VALUES (?, ?, ?, (SELECT COALESCE(MAX(sort), -1) + 1 FROM book_sections WHERE chapter_id = ?)) RETURNING id",
    [chapterId, str(b.number), title, chapterId]
  );
  await syncChapter(chapterId);
  return Response.json({ id: Number(rs.rows[0].id) }, { status: 201 });
});
