"use client";

import { useState } from "react";
import { niceDate } from "../../../lib/time";

// Cards reviewed per day; the "Again" share is a darker segment at the base.
export default function ReviewBars({ days }: { days: { date: string; n: number; again: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(10, ...days.map((d) => d.n));
  const H = 110;
  return (
    <div>
      <div className="relative flex items-end gap-[3px]" style={{ height: H }} onMouseLeave={() => setHover(null)}>
        {days.map((d, i) => (
          <div key={d.date} className="flex h-full flex-1 flex-col justify-end" onMouseEnter={() => setHover(i)}>
            <div className={`flex flex-col gap-[2px] ${hover != null && hover !== i ? "opacity-60" : ""}`}>
              {d.n - d.again > 0 && <div className="rounded-t-[3px] bg-[#3987e5]" style={{ height: ((d.n - d.again) / max) * H }} />}
              {d.again > 0 && <div className="bg-[#d95926]" style={{ height: Math.max(2, (d.again / max) * H - 2) }} />}
            </div>
          </div>
        ))}
        {hover != null && (
          <div
            className="pointer-events-none absolute top-0 rounded border border-line bg-canvas px-2 py-1 text-xs shadow"
            style={{ left: `${((hover + 0.5) / days.length) * 100}%`, transform: `translateX(${hover > days.length / 2 ? "-105%" : "5%"})` }}
          >
            <p className="text-faint">{niceDate(days[hover].date)}</p>
            <p className="text-prose">{days[hover].n} reviews</p>
            {days[hover].n > 0 && <p className="text-faint">{days[hover].again} again</p>}
          </div>
        )}
      </div>
      <div className="mt-2 flex gap-4 text-[11px] text-subtle">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#3987e5]" /> Recalled
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#d95926]" /> Again
        </span>
        <span className="ml-auto text-faint">max {max}/day</span>
      </div>
    </div>
  );
}
