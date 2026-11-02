"use client";

import { useState } from "react";
import { GENERAL_COLOR, SECTIONS } from "../../lib/sections";
import { hm, niceDate } from "../../lib/time";

// Hours studied per week, stacked by section, with the plan's hours as a
// tick per week when there is a plan. One axis (hours).

const SERIES = [...SECTIONS.map((s) => ({ id: s.id, label: s.short, color: s.color })), { id: "", label: "General", color: GENERAL_COLOR }];

export default function WeeklyHours({
  weeks,
  planned,
}: {
  weeks: { start: string; bySection: Record<string, number>; total: number }[];
  planned?: Record<string, number>;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const H = 150;
  const max = Math.max(60, ...weeks.map((w) => w.total), ...Object.values(planned ?? {})) / 60;
  const top = Math.ceil(max / 5) * 5;
  const ticks = [0, top / 2, top];
  const y = (h: number) => H - (h / top) * H;
  const used = SERIES.filter((s) => weeks.some((w) => (w.bySection[s.id] ?? 0) > 0));

  return (
    <div>
      <div className="relative flex">
        <div className="relative mr-2 w-8 text-right text-[10px] text-faint" style={{ height: H }}>
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: y(t) }}>
              {t}h
            </span>
          ))}
        </div>
        <div className="relative flex-1" style={{ height: H }} onMouseLeave={() => setHover(null)}>
          {ticks.map((t) => (
            <div key={t} className="absolute inset-x-0 border-t border-line/70" style={{ top: y(t) }} />
          ))}
          <div className="absolute inset-0 flex items-end gap-[6%] px-[2%]">
            {weeks.map((w, i) => {
              const plan = planned?.[w.start];
              return (
                <div key={w.start} className="relative flex h-full flex-1 flex-col justify-end" onMouseEnter={() => setHover(i)}>
                  <div className={`flex flex-col-reverse gap-[2px] transition-opacity ${hover != null && hover !== i ? "opacity-60" : ""}`}>
                    {SERIES.map((s) => {
                      const m = w.bySection[s.id] ?? 0;
                      if (!m) return null;
                      return <div key={s.id} style={{ height: (m / 60 / top) * H - 2, background: s.color }} className="min-h-[2px] first:rounded-b-[2px] last:rounded-t-[4px]" />;
                    })}
                  </div>
                  {plan ? <div className="absolute inset-x-[-3px] border-t-2 border-dashed border-subtle/70" style={{ top: y(plan / 60) }} /> : null}
                </div>
              );
            })}
          </div>
          {hover != null && (
            <div
              className="pointer-events-none absolute z-10 min-w-[9rem] rounded border border-line bg-canvas px-2.5 py-2 text-xs shadow"
              style={{ left: `${((hover + 0.5) / weeks.length) * 100}%`, top: 0, transform: `translateX(${hover > weeks.length / 2 ? "-105%" : "8%"})` }}
            >
              <p className="mb-1 text-faint">Week of {niceDate(weeks[hover].start, { month: "short", day: "numeric" })}</p>
              {used.map((s) => (
                <p key={s.id} className="flex items-center gap-1.5 text-subtle">
                  <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                  {s.label}
                  <span className="ml-auto pl-3 tabular-nums text-prose">{hm(weeks[hover].bySection[s.id] ?? 0)}</span>
                </p>
              ))}
              <p className="mt-1 flex border-t border-line pt-1 text-prose">
                Total <span className="ml-auto tabular-nums">{hm(weeks[hover].total)}</span>
              </p>
              {planned?.[weeks[hover].start] ? (
                <p className="flex text-faint">
                  Planned <span className="ml-auto tabular-nums">{hm(planned[weeks[hover].start])}</span>
                </p>
              ) : null}
            </div>
          )}
        </div>
      </div>
      <div className="mt-1 ml-10 flex px-[2%] text-[10px] text-faint">
        {weeks.map((w, i) => (
          <span key={w.start} className="flex-1 text-center">
            {i % 2 === weeks.length % 2 ? "" : niceDate(w.start, { month: "numeric", day: "numeric" })}
          </span>
        ))}
      </div>
      <div className="mt-2 ml-10 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-subtle">
        {used.map((s) => (
          <span key={s.id} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
        {planned && Object.keys(planned).length > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="w-3 border-t-2 border-dashed border-subtle/70" /> Planned
          </span>
        )}
      </div>
    </div>
  );
}
