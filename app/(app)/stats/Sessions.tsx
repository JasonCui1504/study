"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { topic } from "../../../lib/outline";
import type { StudySession } from "../../../lib/queries";
import { sectionColor, sectionShort } from "../../../lib/sections";
import { hm, niceDate } from "../../../lib/time";
import SectionSelect from "../../components/SectionSelect";
import TopicSelect from "../../components/TopicSelect";
import { api, btnCls, errMsg, ghostCls, inputCls, panelCls } from "../../ui";

/** Recent study sessions, editable, plus a form to log time you didn't track live. */
export default function Sessions({ sessions, today }: { sessions: StudySession[]; today: string }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ date: today, minutes: "60", section: "", topic_id: "", notes: "" });
  const [editing, setEditing] = useState<number | null>(null);
  const [editMin, setEditMin] = useState("");
  const [error, setError] = useState("");

  async function run(fn: () => Promise<unknown>) {
    setError("");
    try {
      await fn();
      router.refresh();
    } catch (err) {
      setError(errMsg(err));
    }
  }

  return (
    <section className={panelCls}>
      <div className="mb-3 flex items-center">
        <h2 className="text-sm font-medium text-prose">Study sessions</h2>
        <button onClick={() => setAdding(!adding)} className={`${ghostCls} ml-auto`}>
          {adding ? "cancel" : "+ log time manually"}
        </button>
      </div>
      {adding && (
        <form
          className="mb-4 grid gap-2 rounded border border-line bg-canvas p-3 sm:grid-cols-[auto_auto_1fr_1fr]"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              await api("sessions", "POST", { manual: true, ...f, minutes: Number(f.minutes), topic_id: f.topic_id || null });
              setAdding(false);
            });
          }}
        >
          <input type="date" max={today} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} className={inputCls} />
          <input type="number" min={1} max={960} value={f.minutes} onChange={(e) => setF({ ...f, minutes: e.target.value })} className={`${inputCls} w-24`} aria-label="Minutes" />
          <SectionSelect value={f.section} onChange={(v) => setF({ ...f, section: v, topic_id: "" })} />
          <TopicSelect value={f.topic_id} onChange={(v) => setF({ ...f, topic_id: v })} section={f.section || undefined} />
          <input value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Notes" className={`${inputCls} sm:col-span-3`} />
          <button className={btnCls}>Log {f.minutes || 0} min</button>
        </form>
      )}
      {error && <p className="mb-2 text-sm text-red-400">{error}</p>}
      <ul className="divide-y divide-line">
        {sessions.map((s) => {
          const t = topic(s.topic_id);
          return (
            <li key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
              <span className="w-24 text-xs text-faint">{niceDate(s.local_date)}</span>
              <span className="flex w-16 items-center gap-1.5 text-xs text-subtle">
                <span className="h-2 w-2 rounded-full" style={{ background: sectionColor(s.section) }} />
                {sectionShort(s.section)}
              </span>
              <span className="min-w-0 flex-1 truncate text-xs text-faint">{[t && `${t.id} ${t.name}`, s.notes].filter(Boolean).join(" · ")}</span>
              {editing === s.id ? (
                <span className="flex items-center gap-1">
                  <input type="number" value={editMin} onChange={(e) => setEditMin(e.target.value)} className={`${inputCls} w-20 py-0.5`} autoFocus />
                  <button
                    onClick={() =>
                      run(async () => {
                        await api(`sessions/${s.id}`, "PATCH", { minutes: Number(editMin) });
                        setEditing(null);
                      })
                    }
                    className={ghostCls}
                  >
                    save
                  </button>
                </span>
              ) : (
                <button
                  onClick={() => {
                    setEditing(s.id);
                    setEditMin(String(s.minutes));
                  }}
                  className="tabular-nums text-prose hover:text-accent"
                  title="Edit minutes"
                >
                  {hm(s.minutes)}
                </button>
              )}
              <button onClick={() => confirm("Delete this session?") && run(() => api(`sessions/${s.id}`, "DELETE"))} className="text-xs text-faint hover:text-red-400" aria-label="Delete session">
                ×
              </button>
            </li>
          );
        })}
        {!sessions.length && <li className="py-4 text-sm text-faint">No sessions yet. Press “Start studying” at the top of any page.</li>}
      </ul>
    </section>
  );
}
