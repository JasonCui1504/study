import { addCards, type NewCard } from "../../../../lib/card-store";
import { bad, body, id, route, str } from "../../../../lib/route";

// Imports pasted or uploaded text: CSV/TSV with front, back[, tags] columns,
// or an Anki "Notes in Plain Text" export (tab-separated, # header lines,
// HTML fields). Cloze notes ({{c1::…}}) are detected automatically.

/** Splits delimited text, honouring double-quoted fields with embedded delimiters, quotes and newlines. */
function parseDelimited(text: string, delim: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"' && field === "") quoted = true;
    else if (ch === delim) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** Anki fields are HTML: keep line breaks, bold/italic, sub/superscripts; drop the rest. */
function fromHtml(s: string): string {
  return s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(div|p|li)>/gi, "\n")
    .replace(/<(b|strong)>(.*?)<\/\1>/gi, "**$2**")
    .replace(/<(i|em)>(.*?)<\/\1>/gi, "*$2*")
    .replace(/<sup>(.*?)<\/sup>/gi, "^{$1}")
    .replace(/<sub>(.*?)<\/sub>/gi, "_{$1}")
    .replace(/<img[^>]*src="(https?:\/\/[^"]+)"[^>]*>/gi, "![]($1)")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export const POST = route(async (request) => {
  const b = await body(request);
  const deckId = id(b.deck_id);
  const text = typeof b.text === "string" ? b.text : "";
  if (!text.trim()) throw bad("Nothing to import");
  if (text.length > 5_000_000) throw bad("That file is too big (5 MB max)");
  const lines = text.split(/\r?\n/);
  const header = lines.filter((l) => l.startsWith("#"));
  const content = lines.filter((l) => !l.startsWith("#")).join("\n");
  const sepHeader = header.find((l) => /^#separator:/i.test(l))?.split(":")[1]?.trim().toLowerCase();
  const delim =
    sepHeader === "tab" ? "\t" : sepHeader === "comma" ? "," : sepHeader === "semicolon" ? ";" : content.includes("\t") ? "\t" : ",";
  const html = header.some((l) => /^#html:true/i.test(l)) || /<(br|div|b|i|span)\b/i.test(content);
  const tagsColumn = Number(header.find((l) => /^#tags column:/i.test(l))?.split(":")[1]) || 0;
  const clean = (s: string) => (html ? fromHtml(s) : s.trim());

  let rows = parseDelimited(content, delim).filter((r) => r.some((f) => f.trim()));
  if (b.skip_header && rows.length) rows = rows.slice(1);
  const notes: NewCard[] = rows.map((r) => ({
    front: clean(r[0] ?? ""),
    back: clean(r[1] ?? ""),
    tags: tagsColumn ? (r[tagsColumn - 1] ?? "").trim() : r.length > 2 ? (r[2] ?? "").trim() : "",
    extra: "",
    topic_id: str(b.topic_id) || null,
  }));
  const ids = await addCards(deckId, notes);
  return { imported: notes.filter((n) => n.front).length, cards: ids.length };
});
