"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { KIND_LABELS, type TaskKind } from "../../../lib/planner";
import type { Task } from "../../../lib/queries";
import { sectionColor, sectionShort, SECTIONS, GENERAL_COLOR } from "../../../lib/sections";
import { addDays, clock, hm, niceDate, weekStart } from "../../../lib/time";
import RebuildPlan from "../../components/RebuildPlan";
import TaskList from "../../components/TaskList";
import { api, errMsg, ghostCls, quietBtnCls } from "../../ui";
import TaskForm from "./TaskForm";

type View = "month" | "week" | "agenda";
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOUR_PX = 44;
const FIRST_HOUR = 5;
const LAST_HOUR = 24;
const SNAP = 15;

function shiftMonth(month: string, by: number) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + by, 1)).toISOString().slice(0, 7);
}

export default function ScheduleClient({
  tasks: initial,
  today,
  examDate,
  dayStart,
}: {
  tasks: Task[];
  today: string;
  examDate: string | null;
  dayStart: number;
}) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initial);
  const [prev, setPrev] = useState(initial);
  if (initial !== prev) {
    setPrev(initial);
    setTasks(initial);
  }
  // Until a view is picked, narrow screens get the agenda and wider ones the week.
  const [picked, setView] = useState<View | null>(null);
  const narrow = useSyncExternalStore(
    (cb) => {
      window.addEventListener("resize", cb);
      return () => window.removeEventListener("resize", cb);
    },
    () => window.innerWidth < 640,
    () => false
  );
  const view: View = picked ?? (narrow ? "agenda" : "week");
  const [cursor, setCursor] = useState(today); // any date inside the shown month/week
  const [editing, setEditing] = useState<(Partial<Task> & { date: string }) | null>(null);
  const [selected, setSelected] = useState<string | null>(today);
  const [error, setError] = useState("");

  const byDate = useMemo(() => {
    const m = new Map<string, Task[]>();
    for (const t of tasks) m.set(t.date, [...(m.get(t.date) ?? []), t]);
    return m;
  }, [tasks]);

  /** Optimistic move/resize, then save. */
  async function update(id: number, patch: Partial<Task>) {
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    try {
      await api(`tasks/${id}`, "PATCH", patch);
      router.refresh();
    } catch (err) {
      setError(errMsg(err));
      setTasks(initial);
    }
  }

  const hasPlan = tasks.some((t) => t.auto);
  const title =
    view === "month"
      ? new Date(cursor + "T00:00:00Z").toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })
      : view === "week"
        ? `Week of ${niceDate(weekStart(cursor), { month: "short", day: "numeric" })}`
        : "Upcoming";
  const step = (by: number) =>
    setCursor(view === "month" ? shiftMonth(cursor.slice(0, 7), by) + "-01" : addDays(cursor, by * 7));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-2 text-xl font-medium text-prose">Schedule</h1>
        <div className="flex rounded border border-line p-0.5">
          {(["month", "week", "agenda"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} className={`rounded px-2.5 py-1 text-xs capitalize ${view === v ? "bg-lift text-prose" : "text-faint hover:text-subtle"}`}>
              {v}
            </button>
          ))}
        </div>
        {view !== "agenda" && (
          <div className="flex items-center gap-1">
            <button onClick={() => step(-1)} className="rounded px-2 text-xl text-faint hover:text-prose" aria-label="Previous">
              ‹
            </button>
            <span className="min-w-[9rem] text-center text-sm text-prose">{title}</span>
            <button onClick={() => step(1)} className="rounded px-2 text-xl text-faint hover:text-prose" aria-label="Next">
              ›
            </button>
            <button onClick={() => setCursor(today)} className="ml-1 rounded border border-line px-2 py-0.5 text-xs text-subtle hover:text-prose">
              Today
            </button>
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setEditing({ date: selected ?? today, start_min: dayStart, duration_min: 60 })} className={quietBtnCls}>
            + Task
          </button>
          <RebuildPlan
            label={hasPlan ? "Rebuild plan" : "Build my plan"}
            confirmText={hasPlan ? "Rebuild the plan from today? Unfinished generated tasks are redistributed; done tasks and ones you added or moved stay." : undefined}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-subtle">
        {SECTIONS.map((s) => (
          <span key={s.id} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
            {s.short}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: GENERAL_COLOR }} />
          General (cards, full-lengths)
        </span>
        {examDate && <span className="ml-auto text-faint">Exam {niceDate(examDate)}</span>}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {!tasks.length && (
        <p className="rounded-lg border border-line bg-surface p-4 text-sm text-faint">
          {examDate ? "No plan yet. Build one, or add tasks by hand." : "Set your exam date and weekly hours in Settings, then build your plan."}
        </p>
      )}

      {view === "month" && (
        <MonthView
          month={cursor.slice(0, 7)}
          today={today}
          examDate={examDate}
          byDate={byDate}
          selected={selected}
          onSelect={setSelected}
          onOpen={(t) => setEditing(t)}
          onMove={(id, date) => update(id, { date })}
        />
      )}
      {view === "week" && (
        <WeekView
          start={weekStart(cursor)}
          today={today}
          examDate={examDate}
          byDate={byDate}
          dayStart={dayStart}
          onOpen={(t) => setEditing(t)}
          onNew={(date, start_min) => setEditing({ date, start_min, duration_min: 60 })}
          onChange={update}
        />
      )}
      {view === "agenda" && <Agenda today={today} byDate={byDate} onOpen={(t) => setEditing(t)} />}

      {view === "month" && selected && (
        <section className="rounded-lg border border-line bg-surface p-4">
          <div className="mb-1 flex items-center">
            <h2 className="text-sm font-medium text-prose">{niceDate(selected, { weekday: "long", month: "long", day: "numeric" })}</h2>
            <button onClick={() => setEditing({ date: selected, start_min: dayStart, duration_min: 60 })} className={`${ghostCls} ml-auto`}>
              + add task
            </button>
          </div>
          <TaskList tasks={byDate.get(selected) ?? []} sessionOpen={false} empty="Nothing planned. A rest day!" />
        </section>
      )}

      {editing && <TaskForm task={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function Chip({ t, onOpen, draggable }: { t: Task; onOpen: (t: Task) => void; draggable?: boolean }) {
  const color = sectionColor(t.section);
  return (
    <button
      draggable={draggable}
      onDragStart={(e) => e.dataTransfer.setData("text/task", String(t.id))}
      onClick={(e) => {
        e.stopPropagation();
        onOpen(t);
      }}
      title={`${t.title} · ${hm(t.duration_min)}`}
      className={`flex w-full items-center gap-1 truncate rounded-sm px-1 py-px text-left text-[10px] leading-4 text-prose ${t.done ? "opacity-45 line-through" : ""}`}
      style={{ background: `${color}33`, borderLeft: `2px solid ${color}` }}
    >
      <span className="truncate">{t.kind === "exam" ? "🎯 " : ""}{t.title}</span>
    </button>
  );
}

function MonthView({
  month,
  today,
  examDate,
  byDate,
  selected,
  onSelect,
  onOpen,
  onMove,
}: {
  month: string;
  today: string;
  examDate: string | null;
  byDate: Map<string, Task[]>;
  selected: string | null;
  onSelect: (d: string) => void;
  onOpen: (t: Task) => void;
  onMove: (id: number, date: string) => void;
}) {
  const first = `${month}-01`;
  const gridStart = weekStart(first);
  const next = shiftMonth(month, 1) + "-01";
  const weeks = Math.ceil((Date.parse(next) - Date.parse(gridStart)) / 86_400_000 / 7);
  const [over, setOver] = useState<string | null>(null);

  return (
    <section className="rounded-lg border border-line bg-surface p-2 sm:p-3">
      <div className="grid grid-cols-7 pb-1 text-center text-[11px] text-faint">
        {WEEKDAYS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 border-t border-l border-line">
        {Array.from({ length: weeks * 7 }, (_, i) => {
          const d = addDays(gridStart, i);
          const list = byDate.get(d) ?? [];
          const mins = list.filter((t) => t.kind !== "exam" && t.kind !== "rest").reduce((a, t) => a + t.duration_min, 0);
          const other = d.slice(0, 7) !== month;
          return (
            <div
              key={d}
              onClick={() => onSelect(d)}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(d);
              }}
              onDragLeave={() => setOver(null)}
              onDrop={(e) => {
                e.preventDefault();
                setOver(null);
                const id = Number(e.dataTransfer.getData("text/task"));
                if (id) onMove(id, d);
              }}
              className={`min-h-[92px] cursor-pointer border-r border-b border-line p-1 transition-colors ${
                over === d ? "bg-accent/25" : selected === d ? "bg-lift" : other ? "bg-canvas/40" : "hover:bg-lift/40"
              } ${d === examDate ? "ring-1 ring-inset ring-[#d55181]" : ""}`}
            >
              <div className="mb-0.5 flex items-center text-[11px]">
                <span
                  className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 tabular-nums ${
                    d === today ? "bg-accent text-prose" : other ? "text-faint/60" : "text-faint"
                  }`}
                >
                  {Number(d.slice(8))}
                </span>
                {mins > 0 && <span className="ml-auto hidden text-[10px] text-faint sm:inline">{hm(mins)}</span>}
              </div>
              <div className="hidden space-y-px sm:block">
                {list.slice(0, 4).map((t) => (
                  <Chip key={t.id} t={t} onOpen={onOpen} draggable />
                ))}
                {list.length > 4 && <p className="px-1 text-[10px] text-faint">+{list.length - 4} more</p>}
              </div>
              {/* Phones: one dot per task. */}
              <div className="flex flex-wrap gap-0.5 sm:hidden">
                {list.slice(0, 8).map((t) => (
                  <span key={t.id} className={`h-1.5 w-1.5 rounded-full ${t.done ? "opacity-40" : ""}`} style={{ background: sectionColor(t.section) }} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-faint">Drag a task to another day to move it · tap a day to see its tasks</p>
    </section>
  );
}

type Drag = { id: number; mode: "move" | "resize"; x0: number; y0: number; dx: number; dy: number; moved: boolean; colW: number };

function layout(list: Task[]) {
  // Side-by-side lanes for overlapping blocks.
  const timed = list.filter((t) => t.start_min != null).sort((a, b) => a.start_min! - b.start_min! || b.duration_min - a.duration_min);
  const ends: number[] = [];
  const placed = timed.map((t) => {
    let lane = ends.findIndex((e) => e <= t.start_min!);
    if (lane === -1) {
      lane = ends.length;
      ends.push(0);
    }
    ends[lane] = t.start_min! + t.duration_min;
    return { t, lane };
  });
  return { placed, lanes: Math.max(1, ends.length) };
}

function WeekView({
  start,
  today,
  examDate,
  byDate,
  dayStart,
  onOpen,
  onNew,
  onChange,
}: {
  start: string;
  today: string;
  examDate: string | null;
  byDate: Map<string, Task[]>;
  dayStart: number;
  onOpen: (t: Task) => void;
  onNew: (date: string, start_min: number) => void;
  onChange: (id: number, patch: Partial<Task>) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [nowMin, setNowMin] = useState<number | null>(null);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));

  useEffect(() => {
    scroller.current?.scrollTo({ top: Math.max(0, (dayStart / 60 - FIRST_HOUR - 0.5) * HOUR_PX) });
  }, [dayStart]);
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setNowMin(d.getHours() * 60 + d.getMinutes());
    };
    tick();
    const t = setInterval(tick, 60_000);
    return () => clearInterval(t);
  }, []);

  const colWidth = (el: HTMLElement) => (el.closest("[data-cols]")?.getBoundingClientRect().width ?? 700) / 7;
  const snap = (px: number) => Math.round((px / HOUR_PX) * 60 / SNAP) * SNAP;

  function preview(t: Task): { date: string; start: number; duration: number } {
    if (!drag || drag.id !== t.id || !drag.moved) return { date: t.date, start: t.start_min!, duration: t.duration_min };
    if (drag.mode === "resize") return { date: t.date, start: t.start_min!, duration: Math.max(SNAP, t.duration_min + snap(drag.dy)) };
    const dayShift = Math.round(drag.dx / drag.colW);
    const s = Math.min(LAST_HOUR * 60 - SNAP, Math.max(FIRST_HOUR * 60, t.start_min! + snap(drag.dy)));
    const idx = Math.min(6, Math.max(0, days.indexOf(t.date) + dayShift));
    return { date: days[idx], start: s, duration: t.duration_min };
  }

  function finish(t: Task) {
    if (!drag) return;
    if (!drag.moved) {
      setDrag(null);
      onOpen(t);
      return;
    }
    const p = preview(t);
    setDrag(null);
    if (drag.mode === "resize") onChange(t.id, { duration_min: p.duration });
    else if (p.date !== t.date || p.start !== t.start_min) onChange(t.id, { date: p.date, start_min: p.start });
  }

  const all = days.flatMap((d) => byDate.get(d) ?? []);
  const untimed = days.map((d) => (byDate.get(d) ?? []).filter((t) => t.start_min == null));
  const hours = Array.from({ length: LAST_HOUR - FIRST_HOUR }, (_, i) => FIRST_HOUR + i);

  return (
    <section className="overflow-hidden rounded-lg border border-line bg-surface">
      <div className="grid grid-cols-[44px_1fr] border-b border-line">
        <div />
        <div className="grid grid-cols-7">
          {days.map((d) => {
            const list = byDate.get(d) ?? [];
            const mins = list.filter((t) => t.kind !== "exam" && t.kind !== "rest").reduce((a, t) => a + t.duration_min, 0);
            return (
              <div key={d} className={`border-l border-line px-1 py-1.5 text-center ${d === examDate ? "bg-[#d55181]/15" : ""}`}>
                <p className="text-[10px] uppercase tracking-wider text-faint">{niceDate(d, { weekday: "short" })}</p>
                <p className={`mx-auto mt-0.5 inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-sm tabular-nums ${d === today ? "bg-accent text-prose" : "text-subtle"}`}>
                  {Number(d.slice(8))}
                </p>
                <p className="text-[10px] text-faint">{mins ? hm(mins) : " "}</p>
              </div>
            );
          })}
        </div>
      </div>
      {untimed.some((u) => u.length) && (
        <div className="grid grid-cols-[44px_1fr] border-b border-line">
          <div className="py-1 pr-1 text-right text-[9px] text-faint">all day</div>
          <div className="grid grid-cols-7">
            {untimed.map((list, i) => (
              <div key={i} className="space-y-px border-l border-line p-0.5">
                {list.map((t) => (
                  <Chip key={t.id} t={t} onOpen={onOpen} />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
      <div ref={scroller} className="relative max-h-[68vh] overflow-y-auto">
        <div className="grid grid-cols-[44px_1fr]">
          <div className="relative" style={{ height: hours.length * HOUR_PX }}>
            {hours.map((h, i) => (
              <span key={h} className="absolute right-1 -translate-y-1/2 text-[9px] text-faint" style={{ top: i * HOUR_PX }}>
                {i ? clock(h * 60).replace(":00", "") : ""}
              </span>
            ))}
          </div>
          <div
            data-cols
            className="relative grid select-none grid-cols-7"
            style={{ height: hours.length * HOUR_PX }}
            onPointerMove={(e) => drag && setDrag({ ...drag, dx: e.clientX - drag.x0, dy: e.clientY - drag.y0, moved: drag.moved || Math.abs(e.clientX - drag.x0) + Math.abs(e.clientY - drag.y0) > 4 })}
          >
            {hours.map((h, i) => (
              <div key={h} className="pointer-events-none absolute inset-x-0 border-t border-line/60" style={{ top: i * HOUR_PX }} />
            ))}
            {days.map((d) => (
              <div
                key={d}
                className="relative border-l border-line"
                onClick={(e) => {
                  if (e.target !== e.currentTarget) return;
                  const y = e.clientY - e.currentTarget.getBoundingClientRect().top;
                  onNew(d, FIRST_HOUR * 60 + Math.floor(((y / HOUR_PX) * 60) / 30) * 30);
                }}
              >
                {d === today && nowMin != null && nowMin >= FIRST_HOUR * 60 && (
                  <div className="pointer-events-none absolute inset-x-0 z-20 border-t-2 border-[#d95926]" style={{ top: ((nowMin - FIRST_HOUR * 60) / 60) * HOUR_PX }} />
                )}
              </div>
            ))}
            {/* Blocks are laid over the columns so they can be dragged across days. */}
            {days.map((d, di) => {
              const { placed, lanes } = layout(byDate.get(d) ?? []);
              return placed.map(({ t, lane }) => {
                const p = preview(t);
                const col = days.indexOf(p.date);
                const dragging = drag?.id === t.id && drag.moved;
                const color = sectionColor(t.section);
                const top = ((p.start - FIRST_HOUR * 60) / 60) * HOUR_PX;
                const height = Math.max(16, (p.duration / 60) * HOUR_PX - 2);
                return (
                  <div
                    key={t.id}
                    onPointerDown={(e) => {
                      if (e.button !== 0) return;
                      e.currentTarget.setPointerCapture(e.pointerId);
                      setDrag({ id: t.id, mode: "move", x0: e.clientX, y0: e.clientY, dx: 0, dy: 0, moved: false, colW: colWidth(e.currentTarget) });
                    }}
                    onPointerUp={() => finish(t)}
                    className={`absolute z-10 cursor-grab touch-none overflow-hidden rounded-[3px] px-1.5 py-0.5 text-[10px] leading-tight text-prose ${
                      dragging ? "z-30 cursor-grabbing opacity-90 shadow-lg" : ""
                    } ${t.done ? "opacity-45" : ""}`}
                    style={{
                      top,
                      height,
                      left: `calc(${(col / 7) * 100}% + ${dragging ? 2 : (lane / lanes) * (100 / 7)}${dragging ? "px" : "%"} + 1px)`,
                      width: dragging ? `calc(${100 / 7}% - 4px)` : `calc(${100 / 7 / lanes}% - 3px)`,
                      background: `${color}40`,
                      borderLeft: `3px solid ${color}`,
                    }}
                    title={`${t.title}\n${clock(p.start)}–${clock(p.start + p.duration)} · ${KIND_LABELS[t.kind as TaskKind] ?? ""}`}
                    data-day={di}
                  >
                    <p className={`truncate font-medium ${t.done ? "line-through" : ""}`}>{t.title}</p>
                    {height > 30 && (
                      <p className="truncate text-faint">
                        {clock(p.start)} · {sectionShort(t.section)}
                      </p>
                    )}
                    <div
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        if (e.button !== 0) return;
                        e.currentTarget.parentElement!.setPointerCapture(e.pointerId);
                        setDrag({ id: t.id, mode: "resize", x0: e.clientX, y0: e.clientY, dx: 0, dy: 0, moved: false, colW: colWidth(e.currentTarget) });
                      }}
                      className="absolute inset-x-0 bottom-0 h-1.5 cursor-ns-resize"
                      aria-hidden
                    />
                  </div>
                );
              });
            })}
          </div>
        </div>
      </div>
      <p className="border-t border-line px-3 py-2 text-[11px] text-faint">
        Drag a block to move it, drag its bottom edge to resize, click empty space to add · {all.length} tasks this week
      </p>
    </section>
  );
}

function Agenda({ today, byDate, onOpen }: { today: string; byDate: Map<string, Task[]>; onOpen: (t: Task) => void }) {
  const days = Array.from({ length: 21 }, (_, i) => addDays(today, i)).filter((d) => byDate.has(d));
  if (!days.length) return <p className="text-sm text-faint">Nothing in the next three weeks.</p>;
  return (
    <div className="space-y-4">
      {days.map((d) => {
        const list = byDate.get(d)!;
        return (
          <section key={d} className="rounded-lg border border-line bg-surface p-4">
            <h2 className="mb-2 flex items-baseline text-sm font-medium text-prose">
              {d === today ? "Today" : niceDate(d, { weekday: "long", month: "short", day: "numeric" })}
              <span className="ml-2 text-xs font-normal text-faint">
                {hm(list.filter((t) => t.kind !== "exam" && t.kind !== "rest").reduce((a, t) => a + t.duration_min, 0))}
              </span>
            </h2>
            <ul className="space-y-1">
              {list.map((t) => (
                <li key={t.id}>
                  <button onClick={() => onOpen(t)} className="flex w-full items-center gap-2 rounded px-1 py-1 text-left hover:bg-lift/50">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: sectionColor(t.section) }} />
                    <span className={`flex-1 truncate text-sm ${t.done ? "text-faint line-through" : "text-prose"}`}>{t.title}</span>
                    <span className="shrink-0 text-xs text-faint">
                      {t.start_min != null ? clock(t.start_min) : ""} · {hm(t.duration_min)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
