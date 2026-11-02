"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { sectionColor, sectionShort } from "../../lib/sections";
import { api, btnCls, errMsg, inputCls, labelCls, quietBtnCls } from "../ui";
import Modal from "./Modal";
import SectionSelect from "./SectionSelect";
import TopicSelect from "./TopicSelect";

export type OpenSession = {
  id: number;
  started_at: string;
  section: string;
  topic_id: string | null;
  task_id: number | null;
  task_title: string | null;
  notes: string;
};

function elapsed(startedAt: string, now: number): string {
  const s = Math.max(0, Math.floor((now - Date.parse(startedAt)) / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}:${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

/** Starts a study session; the open one is stored server-side, so it survives reloads and other devices. */
export async function startSession(opts: { section?: string; topic_id?: string | null; task_id?: number } = {}) {
  await api("sessions", "POST", opts);
}

/**
 * The study-session control. `compact` is the header version; the full one
 * sits on the dashboard. Ending asks what was studied and records the time,
 * which feeds the heatmap and the trend numbers.
 */
export default function StudySession({ open, compact = false }: { open: OpenSession | null; compact?: boolean }) {
  const router = useRouter();
  const now = useNow(!!open);
  const [ending, setEnding] = useState(false);
  const [starting, setStarting] = useState(false);
  const [section, setSection] = useState("");
  const [error, setError] = useState("");

  async function start() {
    setStarting(true);
    setError("");
    try {
      await startSession({ section });
      router.refresh();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setStarting(false);
    }
  }

  if (compact) {
    if (!open) {
      return (
        <button onClick={start} disabled={starting} className="whitespace-nowrap rounded-full border border-accent/70 px-3 py-1 text-xs text-subtle transition-colors hover:bg-accent-dim hover:text-prose">
          ▶ Start studying
        </button>
      );
    }
    return (
      <>
        <button
          onClick={() => setEnding(true)}
          className="flex items-center gap-2 rounded-full border border-accent bg-accent-dim px-3 py-1 text-xs text-prose"
          title="End this study session"
        >
          <span className="live-dot h-2 w-2 rounded-full bg-[#5fb877]" />
          <span className="font-mono tabular-nums">{elapsed(open.started_at, now)}</span>
          <span className="text-subtle">· End</span>
        </button>
        {ending && <EndDialog open={open} live={liveMin(open, now)} onClose={() => setEnding(false)} />}
      </>
    );
  }

  return (
    <div className="rounded-lg border border-line bg-surface p-5">
      {open ? (
        <div className="flex flex-wrap items-center gap-4">
          <span className="live-dot h-3 w-3 rounded-full bg-[#5fb877]" />
          <div>
            <p className={labelCls}>Studying now{open.section ? ` · ${sectionShort(open.section)}` : ""}</p>
            <p className="font-mono text-3xl tabular-nums text-prose">{elapsed(open.started_at, now)}</p>
            {open.task_title && <p className="text-xs text-faint">{open.task_title}</p>}
          </div>
          <button onClick={() => setEnding(true)} className={`${btnCls} ml-auto px-5 py-2.5 text-base`}>
            End session
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <div className="mr-auto">
            <p className="text-base font-medium text-prose">Ready to study?</p>
            <p className="text-xs text-faint">The timer keeps running until you end it, even if you close this page.</p>
          </div>
          <SectionSelect value={section} onChange={setSection} emptyLabel="Any section" className="max-w-[12rem]" />
          <button onClick={start} disabled={starting} className={`${btnCls} px-5 py-2.5 text-base`}>
            ▶ I&apos;m starting to study
          </button>
          {error && <p className="w-full text-sm text-red-400">{error}</p>}
        </div>
      )}
      {open && ending && <EndDialog open={open} live={liveMin(open, now)} onClose={() => setEnding(false)} />}
    </div>
  );
}

const liveMin = (open: OpenSession, now: number) => Math.max(0, Math.floor((now - Date.parse(open.started_at)) / 60000));

function EndDialog({ open, live, onClose }: { open: OpenSession; live: number; onClose: () => void }) {
  const router = useRouter();
  const [minutes, setMinutes] = useState(String(live));
  const [section, setSection] = useState(open.section);
  const [topicId, setTopicId] = useState(open.topic_id ?? "");
  const [notes, setNotes] = useState(open.notes);
  const [taskDone, setTaskDone] = useState(!!open.task_id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(discard = false) {
    setBusy(true);
    setError("");
    try {
      if (discard) await api(`sessions/${open.id}`, "DELETE");
      else
        await api(`sessions/${open.id}`, "PATCH", {
          end: true,
          minutes: Number(minutes),
          section,
          topic_id: topicId || null,
          notes,
          task_done: taskDone,
        });
      onClose();
      router.refresh();
    } catch (err) {
      setError(errMsg(err));
      setBusy(false);
    }
  }

  return (
    <Modal title="End study session" onClose={onClose}>
      <div className="space-y-3">
        <label className="block">
          <span className={labelCls}>Minutes studied</span>
          <div className="mt-1 flex items-center gap-2">
            <input type="number" min={0} max={960} value={minutes} onChange={(e) => setMinutes(e.target.value)} className={`${inputCls} w-28`} />
            <span className="text-xs text-faint">Timer says {live} min. Lower it if you took a long break.</span>
          </div>
        </label>
        <label className="block">
          <span className={labelCls}>Section</span>
          <SectionSelect
            value={section}
            onChange={(v) => {
              setSection(v);
              setTopicId("");
            }}
            emptyLabel="General / mixed"
            className="mt-1 w-full"
          />
        </label>
        <label className="block">
          <span className={labelCls}>Topic (optional)</span>
          <TopicSelect value={topicId} onChange={setTopicId} section={section || undefined} className="mt-1 w-full" />
        </label>
        <label className="block">
          <span className={labelCls}>Notes</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={`${inputCls} mt-1 w-full`} placeholder="What did you cover?" />
        </label>
        {open.task_id && (
          <label className="flex items-center gap-2 text-sm text-subtle">
            <input type="checkbox" checked={taskDone} onChange={(e) => setTaskDone(e.target.checked)} className="accent-[#4a7c59]" />
            Mark “{open.task_title}” done
          </label>
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex items-center gap-2 pt-1">
          <button onClick={() => save()} disabled={busy} className={btnCls}>
            Save {Number(minutes) || 0} min
          </button>
          <button onClick={onClose} className={quietBtnCls}>
            Keep going
          </button>
          <button onClick={() => confirm("Discard this session without recording any time?") && save(true)} className="ml-auto text-xs text-faint hover:text-red-400">
            Discard
          </button>
        </div>
        <p className="text-xs text-faint">
          <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: sectionColor(section) }} />
          Saved time shows in your heatmap and trends.
        </p>
      </div>
    </Modal>
  );
}
