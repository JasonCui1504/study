"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { KIND_LABELS, type TaskKind } from "../../lib/planner";
import { sectionColor, sectionShort } from "../../lib/sections";
import { clock, hm } from "../../lib/time";
import type { Task } from "../../lib/queries";
import { api, errMsg } from "../ui";
import { startSession } from "./StudySession";

/** A day's tasks with a done checkbox and a button to start a study session on one. */
export default function TaskList({ tasks, sessionOpen, empty }: { tasks: Task[]; sessionOpen: boolean; empty?: React.ReactNode }) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function act(id: number, fn: () => Promise<unknown>) {
    setBusy(id);
    setError("");
    try {
      await fn();
      router.refresh();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(null);
    }
  }

  if (!tasks.length) return <div className="py-4 text-sm text-faint">{empty ?? "Nothing planned."}</div>;

  return (
    <ul className="divide-y divide-line">
      {tasks.map((t) => (
        <li key={t.id} className={`flex items-start gap-3 py-2.5 ${t.done ? "opacity-55" : ""}`}>
          <input
            type="checkbox"
            checked={!!t.done}
            disabled={busy === t.id}
            onChange={(e) => act(t.id, () => api(`tasks/${t.id}`, "PATCH", { done: e.target.checked }))}
            className="mt-1 h-4 w-4 shrink-0 accent-[#4a7c59]"
            aria-label={`Mark ${t.title} done`}
          />
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: sectionColor(t.section) }} />
          <div className="min-w-0 flex-1">
            <p className={`text-sm text-prose ${t.done ? "line-through" : ""}`}>{t.title}</p>
            <p className="text-xs text-faint">
              {t.start_min != null ? `${clock(t.start_min)} · ` : ""}
              {hm(t.duration_min)} · {sectionShort(t.section)} · {KIND_LABELS[t.kind as TaskKind] ?? "Other"}
            </p>
          </div>
          {!t.done && !sessionOpen && t.kind !== "exam" && t.kind !== "rest" && (
            <button
              disabled={busy === t.id}
              onClick={() => act(t.id, () => startSession({ task_id: t.id, section: t.section, topic_id: t.topic_id }))}
              className="shrink-0 rounded border border-line px-2 py-1 text-xs text-subtle transition-colors hover:border-accent hover:text-prose"
              title="Start a study session for this task"
            >
              ▶ Start
            </button>
          )}
          {t.kind === "cards" && !t.done && (
            <Link href="/review" className="shrink-0 rounded border border-line px-2 py-1 text-xs text-subtle hover:border-accent hover:text-prose">
              Review
            </Link>
          )}
        </li>
      ))}
      {error && <li className="py-2 text-sm text-red-400">{error}</li>}
    </ul>
  );
}
