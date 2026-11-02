"use client";

import { useState } from "react";
import { hm, niceDate } from "../../lib/time";

// Daily study time as a calendar heatmap: one column per week (Monday on
// top), one-hue ramp from the surface toward bright green.
const STEPS = [
  { min: 0, color: "#1c2820", label: "None" },
  { min: 1, color: "#23452f", label: "Under 1h" },
  { min: 60, color: "#2d6a42", label: "1–2h" },
  { min: 120, color: "#3f8f56", label: "2–4h" },
  { min: 240, color: "#5fb877", label: "4–6h" },
  { min: 360, color: "#9be0ad", label: "6h+" },
];

const color = (m: number) => [...STEPS].reverse().find((s) => m >= s.min)!.color;

export default function Heatmap({ days }: { days: { date: string; minutes: number }[] }) {
  const [hover, setHover] = useState<{ date: string; minutes: number; x: number; y: number } | null>(null);
  const weeks: (typeof days)[] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  const total = days.reduce((a, d) => a + Math.max(0, d.minutes), 0);
  const active = days.filter((d) => d.minutes > 0).length;

  return (
    <div className="relative">
      <div className="scrollbar-none overflow-x-auto pb-1">
        <div className="flex gap-[3px]" onMouseLeave={() => setHover(null)} role="img" aria-label={`Study heatmap: ${hm(total)} over ${active} days`}>
          <div className="mr-1 grid grid-rows-7 gap-[3px] text-[9px] leading-[12px] text-faint">
            {["Mon", "", "Wed", "", "Fri", "", "Sun"].map((d, i) => (
              <span key={i} className="h-3">
                {d}
              </span>
            ))}
          </div>
          {weeks.map((w) => (
            <div key={w[0].date} className="grid grid-rows-7 gap-[3px]">
              {w.map((d) => (
                <div
                  key={d.date}
                  className="h-3 w-3 rounded-[2px]"
                  style={{ background: d.minutes < 0 ? "transparent" : color(d.minutes), outline: d.minutes < 0 ? "1px dashed #243028" : undefined }}
                  onMouseEnter={(e) => {
                    if (d.minutes < 0) return setHover(null);
                    const r = e.currentTarget.getBoundingClientRect();
                    const p = e.currentTarget.closest(".relative")!.getBoundingClientRect();
                    setHover({ ...d, x: r.left - p.left + 6, y: r.top - p.top });
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      {hover && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded border border-line bg-canvas px-2 py-1 text-xs text-prose shadow"
          style={{ left: hover.x, top: hover.y - 4 }}
        >
          <span className="text-faint">{niceDate(hover.date)} · </span>
          {hover.minutes ? hm(hover.minutes) : "No study logged"}
        </div>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-faint">
        <span>
          {hm(total)} over {active} {active === 1 ? "day" : "days"}
        </span>
        <span className="ml-auto flex items-center gap-1">
          Less
          {STEPS.map((s) => (
            <span key={s.min} className="h-2.5 w-2.5 rounded-[2px]" style={{ background: s.color }} title={s.label} />
          ))}
          More
        </span>
      </div>
    </div>
  );
}
