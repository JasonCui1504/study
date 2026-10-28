"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { KIND_LABELS, TASK_KINDS } from "../../../lib/planner";
import type { Task } from "../../../lib/queries";
import Modal from "../../components/Modal";
import SectionSelect from "../../components/SectionSelect";
import TopicSelect from "../../components/TopicSelect";
import { api, btnCls, errMsg, inputCls, labelCls, quietBtnCls } from "../../ui";

const toTime = (m: number | null) => (m == null ? "" : `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
const fromTime = (s: string) => {
  const [h, m] = s.split(":").map(Number);
  return Number.isFinite(h) ? h * 60 + (m || 0) : null;
};

/** Create (no `task.id`) or edit a plan task. */
export default function TaskForm({ task, onClose }: { task: Partial<Task> & { date: string }; onClose: () => void }) {
  const router = useRouter();
  const [f, setF] = useState({
    title: task.title ?? "",
    date: task.date,
    time: toTime(task.start_min ?? null),
    duration: String(task.duration_min ?? 60),
    kind: task.kind ?? "custom",
    section: task.section ?? "",
    topic_id: task.topic_id ?? "",
    notes: task.notes ?? "",
    done: !!task.done,
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const payload = {
      title: f.title,
      date: f.date,
      start_min: f.time ? fromTime(f.time) : null,
      duration_min: Number(f.duration),
      kind: f.kind,
      section: f.section,
      topic_id: f.topic_id || null,
      notes: f.notes,
      done: f.done,
    };
    try {
      if (task.id) await api(`tasks/${task.id}`, "PATCH", payload);
      else await api("tasks", "POST", payload);
      onClose();
      router.refresh();
    } catch (err) {
      setError(errMsg(err));
      setBusy(false);
    }
  }

  return (
    <Modal title={task.id ? "Edit task" : "New task"} onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <input autoFocus value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="What are you studying?" className={`${inputCls} w-full`} />
        <div className="grid grid-cols-3 gap-2">
          <label>
            <span className={labelCls}>Date</span>
            <input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} className={`${inputCls} mt-1 w-full`} />
          </label>
          <label>
            <span className={labelCls}>Start</span>
            <input type="time" step={900} value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} className={`${inputCls} mt-1 w-full`} />
          </label>
          <label>
            <span className={labelCls}>Minutes</span>
            <input type="number" min={5} max={720} step={15} value={f.duration} onChange={(e) => setF({ ...f, duration: e.target.value })} className={`${inputCls} mt-1 w-full`} />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label>
            <span className={labelCls}>Type</span>
            <select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })} className={`${inputCls} mt-1 w-full`}>
              {TASK_KINDS.map((k) => (
                <option key={k} value={k}>
                  {KIND_LABELS[k]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={labelCls}>Section</span>
            <SectionSelect value={f.section} onChange={(v) => setF({ ...f, section: v, topic_id: "" })} className="mt-1 w-full" />
          </label>
        </div>
        <label className="block">
          <span className={labelCls}>Topic</span>
          <TopicSelect value={f.topic_id} onChange={(v) => setF({ ...f, topic_id: v })} section={f.section || undefined} className="mt-1 w-full" />
        </label>
        <label className="block">
          <span className={labelCls}>Notes</span>
          <textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} rows={3} className={`${inputCls} mt-1 w-full`} />
        </label>
        <label className="flex items-center gap-2 text-sm text-subtle">
          <input type="checkbox" checked={f.done} onChange={(e) => setF({ ...f, done: e.target.checked })} className="accent-[#4a7c59]" />
          Done
        </label>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex items-center gap-2">
          <button disabled={busy || !f.title.trim()} className={btnCls}>
            Save
          </button>
          <button type="button" onClick={onClose} className={quietBtnCls}>
            Cancel
          </button>
          {task.id && (
            <button
              type="button"
              onClick={async () => {
                if (!confirm("Delete this task?")) return;
                await api(`tasks/${task.id}`, "DELETE");
                onClose();
                router.refresh();
              }}
              className="ml-auto text-xs text-faint hover:text-red-400"
            >
              Delete
            </button>
          )}
        </div>
        {task.id && task.auto ? <p className="text-[11px] text-faint">Generated by the planner. Editing it keeps it in place when the plan is rebuilt.</p> : null}
      </form>
    </Modal>
  );
}
