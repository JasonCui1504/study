// The small markup cards use, rendered to HTML. Everything is escaped first,
// so only these constructs produce tags:
//   **bold**  *italic*  `code`  x^{2}  H_{2}O  ![alt](https://…)  line breaks
//   {{c1::answer}} / {{c1::answer::hint}} clozes (see renderCloze)

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function inline(html: string): string {
  return html
    .replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g, '<img src="$2" alt="$1" class="card-img" />')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\s][^*]*?)\*/g, "$1<em>$2</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\^\{([^}]*)\}/g, "<sup>$1</sup>")
    .replace(/_\{([^}]*)\}/g, "<sub>$1</sub>")
    .replace(/\r?\n/g, "<br />");
}

export function render(text: string): string {
  return inline(esc(text));
}

/**
 * A cloze note as one card: the cloze numbered `index` is hidden (or, once
 * revealed, highlighted); the other clozes show their answers.
 */
export function renderCloze(text: string, index: number, reveal: boolean): string {
  const html = esc(text).replace(/\{\{c(\d+)::(.*?)(?:::(.*?))?\}\}/g, (_, n, answer, hint) => {
    if (Number(n) !== index) return answer;
    return reveal ? `<span class="cloze">${answer}</span>` : `<span class="cloze">[${hint ?? "…"}]</span>`;
  });
  return inline(html);
}

/** Plain text for lists and search: markup removed. */
export function plain(text: string): string {
  return text
    .replace(/\{\{c\d+::(.*?)(?:::.*?)?\}\}/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "[image]")
    .replace(/[*`]/g, "")
    .replace(/[\^_]\{([^}]*)\}/g, "$1");
}
