import { all, getDb, one, run } from "./db";
import type { BookStatus } from "./book-status";
import type { Toc } from "./toc";

export type BookSection = { id: number; chapter_id: number; number: string; title: string; status: BookStatus; sort: number };
export type Chapter = { id: number; book_id: number; number: string; title: string; status: BookStatus; notes: string; sort: number; sections: BookSection[] };
export type Book = { id: number; title: string; section: string; sort: number; chapters: Chapter[] };

/** Every book with its chapters and their sections, in order. */
export async function getBooks(): Promise<Book[]> {
  const [books, chapters, sections] = await Promise.all([
    all<Omit<Book, "chapters">>("SELECT id, title, section, sort FROM books ORDER BY sort, id"),
    all<Omit<Chapter, "sections">>("SELECT id, book_id, number, title, status, notes, sort FROM chapters ORDER BY sort, id"),
    all<BookSection>("SELECT id, chapter_id, number, title, status, sort FROM book_sections ORDER BY sort, id"),
  ]);
  return books.map((b) => ({
    ...b,
    chapters: chapters
      .filter((c) => c.book_id === b.id)
      .map((c) => ({ ...c, sections: sections.filter((s) => s.chapter_id === c.id) })),
  }));
}

/** Chapter counts by status, per book, for the dashboard. */
export async function bookProgress() {
  return all<{ id: number; title: string; section: string; total: number; mastered: number; learning: number }>(
    `SELECT b.id, b.title, b.section, COUNT(c.id) AS total,
       COALESCE(SUM(c.status = 'mastered'), 0) AS mastered, COALESCE(SUM(c.status = 'learning'), 0) AS learning
     FROM books b LEFT JOIN chapters c ON c.book_id = b.id GROUP BY b.id ORDER BY b.sort, b.id`
  );
}

/**
 * Keeps a chapter in step with its sections after one changes: all mastered
 * → the chapter is mastered; any progress → at least "learning"; a section
 * slipping back un-masters a mastered chapter.
 */
export async function syncChapter(chapterId: number) {
  const r = await one<{ n: number; mastered: number; started: number }>(
    "SELECT COUNT(*) AS n, SUM(status = 'mastered') AS mastered, SUM(status != 'not_started') AS started FROM book_sections WHERE chapter_id = ?",
    [chapterId]
  );
  const n = Number(r?.n ?? 0);
  if (!n) return;
  const ch = await one<{ status: BookStatus }>("SELECT status FROM chapters WHERE id = ?", [chapterId]);
  if (!ch) return;
  let next: BookStatus = ch.status;
  if (Number(r!.mastered) === n) next = "mastered";
  else if (ch.status === "mastered") next = "learning";
  else if (Number(r!.started) > 0 && ch.status === "not_started") next = "learning";
  if (next !== ch.status) await run("UPDATE chapters SET status = ?, updated_at = datetime('now') WHERE id = ?", [next, chapterId]);
}

/** Appends parsed chapters (and their sections) to the end of a book. */
export async function addToc(bookId: number, toc: Toc): Promise<{ chapters: number; sections: number }> {
  const db = await getDb();
  const max = await one<{ m: number | null }>("SELECT MAX(sort) AS m FROM chapters WHERE book_id = ?", [bookId]);
  let sort = Number(max?.m ?? -1) + 1;
  let sections = 0;
  for (const c of toc) {
    const rs = await db.execute({
      sql: "INSERT INTO chapters (book_id, number, title, sort) VALUES (?, ?, ?, ?) RETURNING id",
      args: [bookId, c.number, c.title.slice(0, 300), sort++],
    });
    const chapterId = Number(rs.rows[0].id);
    if (c.sections.length) {
      await db.batch(
        c.sections.map((s, i) => ({
          sql: "INSERT INTO book_sections (chapter_id, number, title, sort) VALUES (?, ?, ?, ?)",
          args: [chapterId, s.number, s.title.slice(0, 300), i],
        })),
        "write"
      );
      sections += c.sections.length;
    }
  }
  return { chapters: toc.length, sections };
}
