"use client";

import { SECTIONS } from "../../lib/sections";
import { inputCls } from "../ui";

export default function SectionSelect({
  value,
  onChange,
  className = "",
  emptyLabel = "General",
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  emptyLabel?: string;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={`${inputCls} ${className}`}>
      <option value="">{emptyLabel}</option>
      {SECTIONS.map((s) => (
        <option key={s.id} value={s.id}>
          {s.short} — {s.name}
        </option>
      ))}
    </select>
  );
}
