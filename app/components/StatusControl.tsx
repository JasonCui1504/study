"use client";

import { BOOK_STATUSES, type BookStatus } from "../../lib/book-status";

/** Haven't started / Still learning / Mastered, as a segmented control. */
export default function StatusControl({
  value,
  onChange,
  compact = false,
  label,
}: {
  value: BookStatus;
  onChange: (s: BookStatus) => void;
  compact?: boolean;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex shrink-0 overflow-hidden rounded border border-line">
      {BOOK_STATUSES.map((s, i) => {
        const on = value === s.id;
        return (
          <button
            key={s.id}
            role="radio"
            aria-checked={on}
            onClick={() => onChange(s.id)}
            title={s.label}
            className={`whitespace-nowrap px-2 py-1 transition-colors ${compact ? "text-[10px]" : "text-[11px]"} ${i ? "border-l border-line" : ""} ${
              on ? "text-prose" : "text-faint hover:bg-lift/60 hover:text-subtle"
            }`}
            style={on ? { background: `${s.color}33`, boxShadow: `inset 0 -2px 0 ${s.color}` } : undefined}
          >
            {s.id === "mastered" && on ? "✓ " : ""}
            {compact ? s.short : s.label}
          </button>
        );
      })}
    </div>
  );
}
