import type { Metadata } from "next";
import { all, one } from "../../../lib/db";
import { retention30, today, trends, type StudySession } from "../../../lib/queries";
import { SECTIONS, GENERAL_COLOR } from "../../../lib/sections";
import { getSettings } from "../../../lib/settings";
import { addDays, hm } from "../../../lib/time";
import Heatmap from "../../components/Heatmap";
import WeeklyHours from "../../components/WeeklyHours";
import { labelCls, panelCls } from "../../ui";
import ReviewBars from "./ReviewBars";
import Sessions from "./Sessions";

export const metadata: Metadata = { title: "Stats" };
export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const settings = await getSettings();
  const t = today(settings);
  const [tr, retention, bySection, reviews, states, sessions, totals] = await Promise.all([
    trends(settings, 52),
    retention30(settings),
    all<{ section: string; m: number }>("SELECT section, SUM(minutes) AS m FROM sessions WHERE ended_at IS NOT NULL GROUP BY section"),
    all<{ local_date: string; n: number; again: number }>(
      "SELECT local_date, COUNT(*) AS n, SUM(rating = 1) AS again FROM reviews WHERE local_date >= ? GROUP BY local_date",
      [addDays(t, -29)]
    ),
    all<{ state: number; n: number }>("SELECT state, COUNT(*) AS n FROM cards WHERE suspended = 0 GROUP BY state"),
    all<StudySession>("SELECT * FROM sessions WHERE ended_at IS NOT NULL ORDER BY started_at DESC, id DESC LIMIT 40"),
    one<{ m: number; n: number }>("SELECT SUM(minutes) AS m, COUNT(*) AS n FROM sessions WHERE ended_at IS NOT NULL"),
  ]);
  const totalMin = Number(totals?.m ?? 0);
  const sectionRows = [...SECTIONS.map((s) => ({ id: s.id, label: s.short, color: s.color })), { id: "", label: "General", color: GENERAL_COLOR }].map((s) => ({
    ...s,
    m: Number(bySection.find((b) => (b.section || "") === s.id)?.m ?? 0),
  }));
  const maxSec = Math.max(1, ...sectionRows.map((s) => s.m));
  const reviewDays = Array.from({ length: 30 }, (_, i) => {
    const d = addDays(t, i - 29);
    const r = reviews.find((x) => x.local_date === d);
    return { date: d, n: Number(r?.n ?? 0), again: Number(r?.again ?? 0) };
  });
  const stateCount = (s: number) => Number(states.find((x) => Number(x.state) === s)?.n ?? 0);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-medium text-prose">Stats</h1>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className={panelCls}>
          <p className={labelCls}>Total study time</p>
          <p className="mt-1 text-2xl tabular-nums text-prose">{hm(totalMin)}</p>
          <p className="text-xs text-faint">{Number(totals?.n ?? 0)} sessions</p>
        </div>
        <div className={panelCls}>
          <p className={labelCls}>Last 7 days</p>
          <p className="mt-1 text-2xl tabular-nums text-prose">{hm(tr.last7)}</p>
          <p className="text-xs text-faint">prior 7: {hm(tr.prev7)}</p>
        </div>
        <div className={panelCls}>
          <p className={labelCls}>Daily average · 28d</p>
          <p className="mt-1 text-2xl tabular-nums text-prose">{hm(tr.avg28)}</p>
          <p className="text-xs text-faint">
            trend {tr.slope >= 0 ? "+" : "−"}
            {Math.abs(tr.slope).toFixed(1)}h/wk per week
          </p>
        </div>
        <div className={panelCls}>
          <p className={labelCls}>Plan adherence · 14d</p>
          <p className="mt-1 text-2xl tabular-nums text-prose">{tr.adherence == null ? "—" : `${Math.round(tr.adherence * 100)}%`}</p>
          <p className="text-xs text-faint">studied ÷ planned time</p>
        </div>
      </div>

      <section className={panelCls}>
        <h2 className="mb-3 text-sm font-medium text-prose">Daily study time · past year</h2>
        <Heatmap days={tr.heatmap} />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr] [&>*]:min-w-0">
        <section className={panelCls}>
          <h2 className="mb-3 text-sm font-medium text-prose">Hours per week</h2>
          <WeeklyHours weeks={tr.weeks} planned={tr.plannedWeeks} />
        </section>
        <section className={panelCls}>
          <h2 className="mb-3 text-sm font-medium text-prose">Time by section · all time</h2>
          <ul className="space-y-3">
            {sectionRows.map((s) => (
              <li key={s.id}>
                <div className="flex text-sm">
                  <span className="flex items-center gap-1.5 text-subtle">
                    <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                    {s.label}
                  </span>
                  <span className="ml-auto tabular-nums text-prose">{hm(s.m)}</span>
                  <span className="w-12 text-right tabular-nums text-faint">{totalMin ? Math.round((s.m / totalMin) * 100) : 0}%</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-lift">
                  <div className="h-full rounded-[2px]" style={{ width: `${(s.m / maxSec) * 100}%`, background: s.color }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className={panelCls}>
        <div className="mb-3 flex flex-wrap items-baseline gap-x-4">
          <h2 className="text-sm font-medium text-prose">Flashcard reviews · 30 days</h2>
          <span className="text-xs text-faint">
            {retention == null ? "" : `retention ${Math.round(retention * 100)}% · `}
            {stateCount(0)} new · {stateCount(1) + stateCount(3)} learning · {stateCount(2)} in review
          </span>
        </div>
        <ReviewBars days={reviewDays} />
      </section>

      <Sessions sessions={sessions} today={t} />
    </div>
  );
}
