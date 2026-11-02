import type { Client } from "@libsql/client";

// The Princeton Review MCAT series, added once so there's somewhere to put
// chapters. Chapter lists differ by edition, so they're entered (or pasted
// as a table of contents) from your own copies.
export const PRINCETON_REVIEW = [
  { title: "MCAT Biology Review", section: "bb" },
  { title: "MCAT Biochemistry Review", section: "bb" },
  { title: "MCAT General Chemistry Review", section: "cp" },
  { title: "MCAT Organic Chemistry Review", section: "cp" },
  { title: "MCAT Physics and Math Review", section: "cp" },
  { title: "MCAT Psychology and Sociology Review", section: "ps" },
  { title: "MCAT Critical Analysis and Reasoning Skills Review", section: "cars" },
];

export async function seedBooks(db: Client) {
  const done = await db.execute("SELECT 1 FROM settings WHERE key = '_books_seeded'");
  if (done.rows.length) return;
  const any = await db.execute("SELECT COUNT(*) AS n FROM books");
  if (Number(any.rows[0].n) === 0) {
    await db.batch(
      PRINCETON_REVIEW.map((b, i) => ({ sql: "INSERT INTO books (title, section, sort) VALUES (?, ?, ?)", args: [b.title, b.section, i] })),
      "write"
    );
  }
  await db.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('_books_seeded', 'true')");
}
