import Link from "next/link";
import Heatmap from "../components/Heatmap";
import RebuildPlan from "../components/RebuildPlan";
import StudySession from "../components/StudySession";
import TaskList from "../components/TaskList";
import WeeklyHours from "../components/WeeklyHours";
import { all, one } from "../../lib/db";
import { getOpenSession } from "../../lib/open-session";
import { TOPICS } from "../../lib/outline";
import { cardCounts, missedCount, retention30, tasksBetween, today, trends } from "../../lib/queries";
import { SECTIONS } from "../../lib/sections";
import { getSettings } from "../../lib/settings";
import { daysBetween, hm, niceDate } from "../../lib/time";
import { btnCls, labelCls, panelCls } from "../ui";

export const dynamic = "force-dynamic";

function Tile({ label, value, sub, children }: { label: string; value: React.ReactNode; sub?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <p className={labelCls}>{label}</p>
      <p className="mt-1 text-2xl font-medium tabular-nums text-prose">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-faint">{sub}</p>}
      {children}
    </div>
  );
}

function Change({ now, before }: { now: number; before: number }) {
  if (!before) return now ? <span className="text-subtle">new this week</span> : <span>no study yet</span>;
  const pct = Math.round(((now - before) / before) * 100);
  const up = pct >= 0;
  return (
    <span className={up ? "text-[#7fd49a]" : "text-[#e7a46b]"}>
      {up ? "▲" : "▼"} {Math.abs(pct)}% <span className="text-faint">vs prior 7 days</span>
    </span>
  );
}

export default async function Dashboard() {
  const settings = await getSettings();
  const t = today(settings);
  const [tr, cards, retention, todays, missed, open, ratings, lastExam] = await Promise.all([
    trends(settings),
    cardCounts(settings),
    retention30(settings),
    tasksBetween(t, t),
    missedCount(settings),
    getOpenSession(),
    all<{ topic_id: string; confidence: number; content_done: number }>("SELECT * FROM topic_ratings"),
    one<{ name: string; date: string; cp: number | null; cars: number | null; bb: number | null; ps: number | null }>(
      "SELECT * FROM exams WHERE kind = 'full_length' ORDER BY date DESC, id DESC LIMIT 1"
    ),
  ]);
  const countdown = settings.exam_date ? daysBetween(t, settings.exam_date) : null;
  const plannedToday = todays.filter((x) => x.kind !== "exam" && x.kind !== "rest").reduce((a, x) => a + x.duration_min, 0);
  const doneToday = todays.filter((x) => x.done).length;
  const weekPct = tr.weekPlanned ? Math.min(100, Math.round((tr.week / tr.weekPlanned) * 100)) : 0;
  const slopeLabel = Math.abs(tr.slope) < 0.5 ? "Holding steady" : tr.slope > 0 ? "Rising" : "Falling";
  const rating = new Map(ratings.map((r) => [r.topic_id, r]));
  const totalScore = lastExam && [lastExam.cp, lastExam.cars, lastExam.bb, lastExam.ps].every((v) => v != null)
    ? lastExam.cp! + lastExam.cars! + lastExam.bb! + lastExam.ps!
    : null;

  return (
    <div className="space-y-6">
      <div className="animate-fade-up flex flex-wrap items-end gap-x-6 gap-y-2">
        <div>
          <p className={labelCls}>{niceDate(t, { weekday: "long", month: "long", day: "numeric" })}</p>
          <h1 className="mt-1 text-2xl font-medium text-prose sm:text-3xl">
            {countdown == null ? (
              "Your MCAT dashboard"
            ) : countdown > 0 ? (
              <>
                <span className="tabular-nums text-accent">{countdown}</span> {countdown === 1 ? "day" : "days"} until the MCAT
              </>
            ) : countdown === 0 ? (
              "Exam day. You've got this."
            ) : (
              "Exam done!"
            )}
          </h1>
          {settings.exam_date && <p className="text-sm text-faint">Test date {niceDate(settings.exam_date, { weekday: "short", month: "long", day: "numeric", year: "numeric" })}</p>}
        </div>
        {!settings.exam_date && (
          <Link href="/settings" className={`${btnCls} ml-auto`}>
            Set your exam date →
          </Link>
        )}
      </div>

      <StudySession open={open} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Tile label="Today" value={hm(tr.today)} sub={plannedToday ? `of ${hm(plannedToday)} planned` : "nothing planned"} />
        <Tile label="This week" value={hm(tr.week)} sub={tr.weekPlanned ? `of ${hm(tr.weekPlanned)} planned` : "Mon–Sun"}>
          {tr.weekPlanned > 0 && (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-lift">
              <div className="h-full rounded-full bg-accent" style={{ width: `${weekPct}%` }} />
            </div>
          )}
        </Tile>
        <Tile label="Daily average · 7d" value={hm(tr.avg7)} sub={<Change now={tr.last7} before={tr.prev7} />} />
        <Tile
          label="Trend · 6 weeks"
          value={
            <span className="text-xl">
              {slopeLabel}
              {Math.abs(tr.slope) >= 0.5 && <span className="ml-1 text-sm text-faint">{tr.slope > 0 ? "+" : "−"}{Math.abs(tr.slope).toFixed(1)}h/wk</span>}
            </span>
          }
          sub={tr.adherence == null ? `28-day avg ${hm(tr.avg28)}/day` : `${Math.round(tr.adherence * 100)}% of plan done · last 14 days`}
        />
        <Tile label="Streak" value={`${tr.streak} ${tr.streak === 1 ? "day" : "days"}`} sub="days with study or reviews" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] [&>*]:min-w-0">
        <section className={panelCls}>
          <div className="mb-2 flex items-center">
            <h2 className="text-base font-medium text-prose">Today&apos;s plan</h2>
            <span className="ml-2 text-xs text-faint">
              {todays.length ? `${doneToday}/${todays.length} done` : ""}
            </span>
            <Link href="/schedule" className="ml-auto text-xs text-faint hover:text-prose">
              Full schedule →
            </Link>
          </div>
          {missed > 0 && (
            <div className="mb-3 flex flex-wrap items-center gap-3 rounded border border-[#c98500]/40 bg-[#c98500]/10 px-3 py-2 text-sm text-subtle">
              <span>
                {missed} unfinished {missed === 1 ? "task" : "tasks"} from earlier days.
              </span>
              <RebuildPlan label="Reschedule them" quiet />
            </div>
          )}
          <TaskList
            tasks={todays}
            sessionOpen={!!open}
            empty={
              settings.exam_date ? (
                <span>
                  Nothing planned today. <RebuildPlan label="Build my study plan" quiet />
                </span>
              ) : (
                <span>
                  <Link href="/settings" className="underline">
                    Set your exam date and hours
                  </Link>{" "}
                  to get a plan.
                </span>
              )
            }
          />
        </section>

        <div className="space-y-6">
          <section className={panelCls}>
            <div className="flex items-center">
              <h2 className="text-base font-medium text-prose">Flashcards</h2>
              <Link href="/decks" className="ml-auto text-xs text-faint hover:text-prose">
                Decks →
              </Link>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-2xl tabular-nums text-prose">{cards.due}</p>
                <p className="text-[11px] text-faint">due</p>
              </div>
              <div>
                <p className="text-2xl tabular-nums text-prose">{cards.newAvailable}</p>
                <p className="text-[11px] text-faint">new today</p>
              </div>
              <div>
                <p className="text-2xl tabular-nums text-prose">{cards.reviewedToday}</p>
                <p className="text-[11px] text-faint">reviewed</p>
              </div>
            </div>
            <Link href="/review" className={`${btnCls} mt-4 block text-center`}>
              {cards.due + cards.newAvailable ? `Review ${cards.due + cards.newAvailable} cards` : "All caught up — browse decks"}
            </Link>
            <p className="mt-2 text-center text-xs text-faint">
              {retention == null ? "Retention appears after your first reviews." : `30-day retention ${Math.round(retention * 100)}%`}
            </p>
          </section>

          <section className={panelCls}>
            <div className="flex items-center">
              <h2 className="text-base font-medium text-prose">Sections</h2>
              <Link href="/outline" className="ml-auto text-xs text-faint hover:text-prose">
                Outline →
              </Link>
            </div>
            <ul className="mt-3 space-y-3">
              {SECTIONS.map((s) => {
                const ts = TOPICS.filter((x) => x.section === s.id);
                const rated = ts.filter((x) => (rating.get(x.id)?.confidence ?? 0) > 0);
                const avg = rated.length ? rated.reduce((a, x) => a + rating.get(x.id)!.confidence, 0) / rated.length : 0;
                const done = ts.filter((x) => rating.get(x.id)?.content_done).length;
                const score = lastExam?.[s.id];
                return (
                  <li key={s.id}>
                    <div className="flex items-baseline gap-2 text-sm">
                      <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                      <span className="text-prose">{s.short}</span>
                      <span className="text-xs text-faint">
                        {done}/{ts.length} reviewed · {avg ? `confidence ${avg.toFixed(1)}/5` : "not rated"}
                      </span>
                      {score != null && <span className="ml-auto tabular-nums text-subtle">{score}</span>}
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-lift">
                      <div className="h-full rounded-full" style={{ width: `${(done / ts.length) * 100}%`, background: s.color }} />
                    </div>
                  </li>
                );
              })}
            </ul>
            {lastExam && (
              <p className="mt-3 text-xs text-faint">
                Last full-length: {lastExam.name}, {niceDate(lastExam.date)}
                {totalScore != null && <span className="text-subtle"> · {totalScore}</span>}
              </p>
            )}
          </section>
        </div>
      </div>

      <section className={panelCls}>
        <div className="mb-3 flex items-center">
          <h2 className="text-base font-medium text-prose">Study time</h2>
          <Link href="/stats" className="ml-auto text-xs text-faint hover:text-prose">
            All stats →
          </Link>
        </div>
        <div className="grid gap-8 lg:grid-cols-[auto_1fr]">
          <div className="min-w-0">
            <Heatmap days={tr.heatmap} />
          </div>
          <div className="min-w-0">
            <p className="mb-2 text-xs text-faint">Hours per week, by section</p>
            <WeeklyHours weeks={tr.weeks} planned={tr.plannedWeeks} />
          </div>
        </div>
      </section>
    </div>
  );
}
