"use client";

import { OUTLINE } from "../../lib/outline";
import { inputCls } from "../ui";

/** A topic picker grouped by content category, optionally limited to one section. */
export default function TopicSelect({
  value,
  onChange,
  section,
  className = "",
  placeholder = "No topic",
}: {
  value: string;
  onChange: (v: string) => void;
  section?: string;
  className?: string;
  placeholder?: string;
}) {
  const cats = OUTLINE.filter((c) => !section || c.section === section);
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={`${inputCls} ${className}`}>
      <option value="">{placeholder}</option>
      {cats.map((c) => (
        <optgroup key={c.id} label={`${c.id} · ${c.name}`}>
          {c.topics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.id} {t.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
