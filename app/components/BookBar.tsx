import { BOOK_STATUSES } from "../../lib/book-status";

/** A thin stacked bar: mastered, then still learning, out of all chapters. */
export default function BookBar({ total, mastered, learning, className = "" }: { total: number; mastered: number; learning: number; className?: string }) {
  const pct = (n: number) => (total ? (n / total) * 100 : 0);
  return (
    <div className={`flex h-1.5 gap-[2px] overflow-hidden rounded-full bg-lift ${className}`} role="img" aria-label={`${mastered} mastered, ${learning} still learning, of ${total}`}>
      {mastered > 0 && <div style={{ width: `${pct(mastered)}%`, background: BOOK_STATUSES[2].color }} />}
      {learning > 0 && <div style={{ width: `${pct(learning)}%`, background: BOOK_STATUSES[1].color }} />}
    </div>
  );
}
