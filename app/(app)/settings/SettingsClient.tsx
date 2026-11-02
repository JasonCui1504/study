"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Settings } from "../../../lib/settings";
import { niceDate } from "../../../lib/time";
import { api, btnCls, errMsg, ghostCls, inputCls, labelCls, panelCls, quietBtnCls } from "../../ui";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const toTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export default function SettingsClient({ settings, feedUrl }: { settings: Settings; feedUrl: string }) {
  const router = useRouter();
  const [s, setS] = useState(settings);
  const [offDay, setOffDay] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const weekly = s.hours.reduce((a, b) => a + b, 0);

  async function save(rebuild: boolean) {
    setBusy(true);
    setMsg("");
    try {
      await api("settings", "PATCH", {
        exam_date: s.exam_date,
        plan_start: s.plan_start,
        hours: s.hours,
        days_off: s.days_off,
        day_start_min: s.day_start_min,
        new_per_day: s.new_per_day,
        max_reviews: s.max_reviews,
        retention: s.retention,
      });
      if (rebuild) {
        const r = await api<{ tasks: number }>("plan", "POST");
        setMsg(`Saved, and planned ${r.tasks} tasks. See the Schedule.`);
      } else setMsg("Saved.");
      router.refresh();
    } catch (err) {
      setMsg(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-xl font-medium text-prose">Settings</h1>

      <section className={`${panelCls} space-y-4`}>
        <h2 className="text-sm font-medium text-prose">Exam and study plan</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <label>
            <span className={labelCls}>Exam date</span>
            <input type="date" value={s.exam_date ?? ""} onChange={(e) => setS({ ...s, exam_date: e.target.value || null })} className={`${inputCls} mt-1 w-full`} />
          </label>
          <label>
            <span className={labelCls}>Start planning on</span>
            <input type="date" value={s.plan_start ?? ""} onChange={(e) => setS({ ...s, plan_start: e.target.value || null })} className={`${inputCls} mt-1 w-full`} />
            <span className="text-[11px] text-faint">Blank = today</span>
          </label>
          <label>
            <span className={labelCls}>Study day starts at</span>
            <input
              type="time"
              step={900}
              value={toTime(s.day_start_min)}
              onChange={(e) => {
                const [h, m] = e.target.value.split(":").map(Number);
                if (Number.isFinite(h)) setS({ ...s, day_start_min: h * 60 + (m || 0) });
              }}
              className={`${inputCls} mt-1 w-full`}
            />
          </label>
        </div>
        <div>
          <span className={labelCls}>Hours available each day · {weekly}h/week</span>
          <div className="mt-1 grid grid-cols-7 gap-1.5">
            {DAYS.map((d, i) => (
              <label key={d} className="text-center">
                <span className="text-[11px] text-faint">{d}</span>
                <input
                  type="number"
                  min={0}
                  max={14}
                  step={0.5}
                  value={s.hours[i]}
                  onChange={(e) => setS({ ...s, hours: s.hours.map((h, j) => (j === i ? Number(e.target.value) : h)) })}
                  className={`${inputCls} mt-0.5 w-full text-center tabular-nums`}
                />
              </label>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-faint">Full-lengths go on your longest days. Most people plan 20–40 hours a week over 2–4 months.</p>
        </div>
        <div>
          <span className={labelCls}>Days off</span>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {s.days_off.map((d) => (
              <span key={d} className="flex items-center gap-1 rounded bg-lift px-2 py-0.5 text-xs text-subtle">
                {niceDate(d)}
                <button onClick={() => setS({ ...s, days_off: s.days_off.filter((x) => x !== d) })} className="text-faint hover:text-prose" aria-label={`Remove ${d}`}>
                  ×
                </button>
              </span>
            ))}
            <input type="date" value={offDay} onChange={(e) => setOffDay(e.target.value)} className={`${inputCls} py-1`} />
            <button
              disabled={!offDay}
              onClick={() => {
                setS({ ...s, days_off: [...new Set([...s.days_off, offDay])].sort() });
                setOffDay("");
              }}
              className={ghostCls}
            >
              + add
            </button>
          </div>
        </div>
      </section>

      <section className={`${panelCls} space-y-4`}>
        <h2 className="text-sm font-medium text-prose">Flashcards</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <label>
            <span className={labelCls}>New cards per day</span>
            <input type="number" min={0} max={500} value={s.new_per_day} onChange={(e) => setS({ ...s, new_per_day: Number(e.target.value) })} className={`${inputCls} mt-1 w-full`} />
          </label>
          <label>
            <span className={labelCls}>Max reviews per day</span>
            <input type="number" min={10} max={5000} value={s.max_reviews} onChange={(e) => setS({ ...s, max_reviews: Number(e.target.value) })} className={`${inputCls} mt-1 w-full`} />
          </label>
          <label>
            <span className={labelCls}>Target retention · {Math.round(s.retention * 100)}%</span>
            <input
              type="range"
              min={0.8}
              max={0.95}
              step={0.01}
              value={s.retention}
              onChange={(e) => setS({ ...s, retention: Number(e.target.value) })}
              className="mt-2 w-full accent-[#4a7c59]"
            />
          </label>
        </div>
        <p className="text-[11px] text-faint">Higher retention means more reviews per day. 90% is the usual choice.</p>
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => save(true)} disabled={busy} className={btnCls}>
          Save &amp; rebuild plan
        </button>
        <button onClick={() => save(false)} disabled={busy} className={quietBtnCls}>
          Save only
        </button>
        {msg && <span className="text-xs text-faint">{msg}</span>}
      </div>

      <section className={`${panelCls} space-y-2`}>
        <h2 className="text-sm font-medium text-prose">Calendar subscription</h2>
        <p className="text-sm text-faint">
          Add your study plan to Google or Apple Calendar. It refreshes on its own as the plan changes. In Google Calendar: Other calendars → + → From URL. Keep the link private: anyone with it can see your plan.
        </p>
        <div className="flex gap-2">
          <input readOnly value={feedUrl} onFocus={(e) => e.target.select()} className={`${inputCls} min-w-0 flex-1 font-mono text-xs`} />
          <button
            onClick={async () => {
              await navigator.clipboard.writeText(feedUrl);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className={quietBtnCls}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <a href={feedUrl.replace(/^https?:/, "webcal:")} className={ghostCls}>
          Open in Apple Calendar →
        </a>
      </section>

      <p className="text-xs text-faint">Time zone: {s.time_zone} (follows this browser)</p>
    </div>
  );
}
