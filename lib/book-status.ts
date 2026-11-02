// Progress states for book chapters and sections (client-safe).

export const BOOK_STATUSES = [
  { id: "not_started", label: "Haven't started", short: "Not started", color: "#8aa498" },
  { id: "learning", label: "Still learning", short: "Learning", color: "#c98500" },
  { id: "mastered", label: "Mastered", short: "Mastered", color: "#5fb877" },
] as const;

export type BookStatus = (typeof BOOK_STATUSES)[number]["id"];

export function isBookStatus(v: unknown): v is BookStatus {
  return BOOK_STATUSES.some((s) => s.id === v);
}
