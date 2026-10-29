// Table-of-contents parsing for pasted chapter lists (client-safe, so the
// import dialog can preview the result).

export type Toc = { number: string; title: string; sections: { number: string; title: string }[] }[];

/**
 * Parses a pasted table of contents into chapters and sections, one per line:
 *   "Chapter 3: Enzymes" / "3. Enzymes" / "3 Enzymes"   → chapter 3
 *   "3.2 Kinetics" (or an indented / bulleted line)       → a section of the last chapter
 *   any other line                                        → an unnumbered chapter
 */
export function parseToc(text: string): Toc {
  const out: Toc = [];
  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim()) continue;
    const indented = /^(\s{2,}|\t)/.test(raw) || /^\s*[-•*–]\s+/.test(raw);
    // Drop bullets and trailing page numbers ("Enzymes ....... 45", "Enzymes    45").
    const line = raw.trim().replace(/^[-•*–]\s+/, "").replace(/\s*\.{3,}\s*\d+$/, "").replace(/(\s{2,}|\t)\d+$/, "").trim();
    const sec = line.match(/^(\d+\.\d+(?:\.\d+)?)[.:)]?\s+(.+)$/);
    const chap = line.match(/^(?:chapter|ch\.?)\s*(\d+)\s*[.:)\-–—]?\s*(.*)$/i) ?? line.match(/^(\d+)[.:)]?\s+(.+)$/);
    if (sec && out.length) out[out.length - 1].sections.push({ number: sec[1], title: sec[2].trim() });
    else if (indented && out.length) out[out.length - 1].sections.push({ number: "", title: line });
    else if (chap) out.push({ number: chap[1], title: chap[2].trim() || `Chapter ${chap[1]}`, sections: [] });
    else out.push({ number: "", title: line, sections: [] });
  }
  return out;
}
