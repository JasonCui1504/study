"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SECTION_MAX, SECTION_MIN, SECTIONS, TOTAL_MAX, TOTAL_MIN, GENERAL_COLOR } from "../../../lib/sections";
import { niceDate } from "../../../lib/time";
import LineChart from "../../components/LineChart";
import Modal from "../../components/Modal";
import { api, btnCls, errMsg, ghostCls, inputCls, labelCls, panelCls, quietBtnCls } from "../../ui";

export type Exam = {
  id: number;
  date: string;
  name: string;
  kind: string;
  cp: number | null;
  cars: number | null;
  bb: number | null;
  ps: number | null;
  reviewed: number;
  notes: string;
};

const KINDS: Record<string, string> = { full_length: "Full-length", section_bank: "Section bank / set", other: "Other" };
const total = (e: Exam) => (e.cp != null && e.cars != null && e.bb != null && e.ps != null ? e.cp + e.cars + e.bb + e.ps : null);

export default function ExamsClient({ exams, today }: { exams: Exam[]; today: string }) {
  const [editing, setEditing] = useState<Partial<Exam> | null>(null);
  const full = exams.filter((e) => e.kind === "full_length");
  const totals = full.map((e) => ({ date: e.date, value: total(e), name: e.name })).filter((p): p is { date: string; value: number; name: string } => p.value != null);
  const best = totals.length ? Math.max(...totals.map((t) => t.value)) : null;
  const last3 = totals.slice(-3);
  const avg3 = last3.length ? Math.round(last3.reduce((a, t) => a + t.value, 0) / last3.length) : null;
  const lo = totals.length ? Math.max(TOTAL_MIN, Math.floor((Math.min(...totals.map((t) => t.value)) - 6) / 5) * 5) : TOTAL_MIN;
  const hi = totals.length ? Math.min(TOTAL_MAX, Math.ceil((Math.max(...totals.map((t) => t.value)) + 6) / 5) * 5) : TOTAL_MAX;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h1 className="text-xl font-medium text-prose">Practice exams</h1>
          <p className="text-sm text-faint">Log full-lengths and section banks. Scores run 118–132 per section, 472–528 total.</p>
        </div>
        <button onClick={() => setEditing({ date: today, kind: "full_length", name: `Full-length #${full.length + 1}` })} className={btnCls}>
          + Log exam
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className={panelCls}>
          <p className={labelCls}>Latest total</p>
          <p className="mt-1 text-2xl tabular-nums text-prose">{totals.length ? totals[totals.length - 1].value : "—"}</p>
        </div>
        <div className={panelCls}>
          <p className={labelCls}>Average of last 3</p>
          <p className="mt-1 text-2xl tabular-nums text-prose">{avg3 ?? "—"}</p>
        </div>
        <div className={panelCls}>
          <p className={labelCls}>Best</p>
          <p className="mt-1 text-2xl tabular-nums text-prose">{best ?? "—"}</p>
        </div>
      </div>

      <section className={panelCls}>
        <h2 className="mb-2 text-sm font-medium text-prose">Full-length total</h2>
        <LineChart points={totals} min={lo} max={hi} color={GENERAL_COLOR} label="Full-length total score" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SECTIONS.map((s) => {
            const pts = full.filter((e) => e[s.id] != null).map((e) => ({ date: e.date, value: e[s.id]!, name: e.name }));
            return (
              <div key={s.id}>
                <p className="mb-1 flex items-center gap-1.5 text-xs text-subtle">
                  <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                  {s.short}
                </p>
                <LineChart points={pts} min={SECTION_MIN} max={SECTION_MAX} color={s.color} height={130} label={`${s.short} score`} />
              </div>
            );
          })}
        </div>
      </section>

      <section className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-[11px] uppercase tracking-widest text-faint">
              <th className="px-4 py-2 font-normal">Date</th>
              <th className="px-2 py-2 font-normal">Exam</th>
              {SECTIONS.map((s) => (
                <th key={s.id} className="px-2 py-2 text-right font-normal">
                  {s.short}
                </th>
              ))}
              <th className="px-2 py-2 text-right font-normal">Total</th>
              <th className="px-4 py-2 font-normal">Reviewed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {[...exams].reverse().map((e) => (
              <tr key={e.id} onClick={() => setEditing(e)} className="cursor-pointer hover:bg-lift/40">
                <td className="whitespace-nowrap px-4 py-2 text-faint">{niceDate(e.date)}</td>
                <td className="px-2 py-2 text-prose">
                  {e.name}
                  <span className="ml-2 text-[11px] text-faint">{KINDS[e.kind]}</span>
                </td>
                {SECTIONS.map((s) => (
                  <td key={s.id} className="px-2 py-2 text-right tabular-nums text-subtle">
                    {e[s.id] ?? "—"}
                  </td>
                ))}
                <td className="px-2 py-2 text-right font-medium tabular-nums text-prose">{total(e) ?? "—"}</td>
                <td className="px-4 py-2">{e.reviewed ? <span className="text-[#7fd49a]">✓</span> : <span className="text-[#e7a46b]">to review</span>}</td>
              </tr>
            ))}
            {!exams.length && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-faint">
                  No exams logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {editing && <ExamForm exam={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function ExamForm({ exam, onClose }: { exam: Partial<Exam>; onClose: () => void }) {
  const router = useRouter();
  const [f, setF] = useState({
    date: exam.date ?? "",
    name: exam.name ?? "",
    kind: exam.kind ?? "full_length",
    cp: exam.cp?.toString() ?? "",
    cars: exam.cars?.toString() ?? "",
    bb: exam.bb?.toString() ?? "",
    ps: exam.ps?.toString() ?? "",
    reviewed: !!exam.reviewed,
    notes: exam.notes ?? "",
  });
  const [error, setError] = useState("");
  const sum = [f.cp, f.cars, f.bb, f.ps].every((v) => v) ? [f.cp, f.cars, f.bb, f.ps].reduce((a, v) => a + Number(v), 0) : null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (exam.id) await api(`exams/${exam.id}`, "PATCH", f);
      else await api("exams", "POST", f);
      onClose();
      router.refresh();
    } catch (err) {
      setError(errMsg(err));
    }
  }

  return (
    <Modal title={exam.id ? "Edit exam" : "Log exam"} onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. AAMC FL 1" className={`${inputCls} col-span-2`} />
          <input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} className={inputCls} />
          <select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })} className={inputCls}>
            {Object.entries(KINDS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {SECTIONS.map((s) => (
            <label key={s.id}>
              <span className={labelCls}>{s.short}</span>
              <input
                type="number"
                min={SECTION_MIN}
                max={SECTION_MAX}
                value={f[s.id]}
                onChange={(e) => setF({ ...f, [s.id]: e.target.value })}
                className={`${inputCls} mt-1 w-full tabular-nums`}
                placeholder="—"
              />
            </label>
          ))}
        </div>
        <p className="text-xs text-faint">{sum != null ? `Total ${sum}` : "Leave sections blank for a partial exam or a set."}</p>
        <textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} rows={3} placeholder="Timing, stamina, what to fix…" className={`${inputCls} w-full`} />
        <label className="flex items-center gap-2 text-sm text-subtle">
          <input type="checkbox" checked={f.reviewed} onChange={(e) => setF({ ...f, reviewed: e.target.checked })} className="accent-[#4a7c59]" />
          Fully reviewed (every miss logged in Mistakes)
        </label>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex items-center gap-2">
          <button className={btnCls}>Save</button>
          <button type="button" onClick={onClose} className={quietBtnCls}>
            Cancel
          </button>
          {exam.id && (
            <button
              type="button"
              onClick={async () => {
                if (!confirm("Delete this exam?")) return;
                await api(`exams/${exam.id}`, "DELETE");
                onClose();
                router.refresh();
              }}
              className={`${ghostCls} ml-auto hover:text-red-400`}
            >
              Delete
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}
