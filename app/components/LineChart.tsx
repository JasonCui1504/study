"use client";

import { useEffect, useRef, useState } from "react";
import { niceDate } from "../../lib/time";

// A single-series line chart over dates with a hover crosshair. Used for
// exam score trends (one chart per measure, never a second y-axis).

export default function LineChart({
  points,
  min,
  max,
  color,
  height = 160,
  label,
  format = (v: number) => String(v),
}: {
  points: { date: string; value: number; name?: string }[];
  min: number;
  max: number;
  color: string;
  height?: number;
  label: string;
  format?: (v: number) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(600);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(200, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = height;
  const pad = { l: 34, r: 12, t: 10, b: 22 };
  if (!points.length)
    return (
      <div ref={box}>
        <p className="py-6 text-center text-xs text-faint">No scores yet.</p>
      </div>
    );
  const t0 = Date.parse(points[0].date);
  const t1 = Date.parse(points[points.length - 1].date);
  const x = (d: string) => (t1 === t0 ? (pad.l + W - pad.r) / 2 : pad.l + ((Date.parse(d) - t0) / (t1 - t0)) * (W - pad.l - pad.r));
  const y = (v: number) => pad.t + (1 - (v - min) / (max - min)) * (H - pad.t - pad.b);
  const ticks = [min, Math.round((min + max) / 2), max];
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(p.date).toFixed(1)},${y(p.value).toFixed(1)}`).join("");

  return (
    <div ref={box} className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`${label}: ${points.map((p) => `${p.date} ${format(p.value)}`).join(", ")}`}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const mx = ((e.clientX - r.left) / r.width) * W;
          let best = 0;
          points.forEach((p, i) => {
            if (Math.abs(x(p.date) - mx) < Math.abs(x(points[best].date) - mx)) best = i;
          });
          setHover(best);
        }}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#243028" />
            <text x={pad.l - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize="10" fill="#8aa498">
              {format(t)}
            </text>
          </g>
        ))}
        {hover != null && <line x1={x(points[hover].date)} x2={x(points[hover].date)} y1={pad.t} y2={H - pad.b} stroke="#8aa498" strokeDasharray="3 3" />}
        <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle key={i} cx={x(p.date)} cy={y(p.value)} r={hover === i ? 5 : 4} fill={color} stroke="#141c17" strokeWidth={2} />
        ))}
        <text x={pad.l} y={H - 4} fontSize="10" fill="#8aa498">
          {niceDate(points[0].date, { month: "short", day: "numeric" })}
        </text>
        {points.length > 1 && (
          <text x={W - pad.r} y={H - 4} fontSize="10" fill="#8aa498" textAnchor="end">
            {niceDate(points[points.length - 1].date, { month: "short", day: "numeric" })}
          </text>
        )}
        {/* Direct label on the latest point. */}
        <text x={x(points[points.length - 1].date)} y={y(points[points.length - 1].value) - 9} fontSize="11" fill="#deeade" textAnchor={points.length > 1 ? "end" : "middle"}>
          {format(points[points.length - 1].value)}
        </text>
      </svg>
      {hover != null && (
        <div
          className="pointer-events-none absolute top-0 rounded border border-line bg-canvas px-2 py-1 text-xs shadow"
          style={{ left: `${(x(points[hover].date) / W) * 100}%`, transform: `translateX(${x(points[hover].date) > W / 2 ? "-110%" : "10%"})` }}
        >
          <p className="text-faint">
            {points[hover].name ? `${points[hover].name} · ` : ""}
            {niceDate(points[hover].date)}
          </p>
          <p className="tabular-nums text-prose">{format(points[hover].value)}</p>
        </div>
      )}
    </div>
  );
}
