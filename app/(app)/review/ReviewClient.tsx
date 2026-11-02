"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { render, renderCloze } from "../../../lib/markup";
import { topic } from "../../../lib/outline";
import SectionSelect from "../../components/SectionSelect";
import { startSession } from "../../components/StudySession";
import { api, errMsg, inputCls, labelCls, quietBtnCls } from "../../ui";

type QCard = {
  id: number;
  kind: "basic" | "cloze";
  front: string;
  back: string;
  extra: string;
  cloze_index: number;
  topic_id: string | null;
  deck_name: string;
  state: number;
  flagged: number;
  previews: Record<1 | 2 | 3 | 4, string>;
};

const GRADES = [
  { r: 1, label: "Again", cls: "border-[#d95926]/60 hover:bg-[#d95926]/20" },
  { r: 2, label: "Hard", cls: "border-[#c98500]/60 hover:bg-[#c98500]/20" },
  { r: 3, label: "Good", cls: "border-accent hover:bg-accent/30" },
  { r: 4, label: "Easy", cls: "border-[#3987e5]/60 hover:bg-[#3987e5]/20" },
] as const;

const MODES = [
  { id: "due", label: "Due today" },
  { id: "struggling", label: "Struggling cards" },
  { id: "cram", label: "Cram (no scheduling)" },
];

// Cards graded into a short learning step come back in this session once due.
const RELEARN_WINDOW_MS = 20 * 60_000;

export default function ReviewClient({
  decks,
  sessionOpen,
  initial,
}: {
  decks: { id: number; name: string }[];
  sessionOpen: boolean;
  initial: { mode: string; deck: string; section: string; topic: string };
}) {
  const router = useRouter();
  const [mode, setMode] = useState(initial.mode);
  const [deck, setDeck] = useState(initial.deck);
  const [section, setSection] = useState(initial.section);
  const [queue, setQueue] = useState<QCard[]>([]);
  const [learning, setLearning] = useState<{ card: QCard; due: number }[]>([]);
  const [current, setCurrent] = useState<QCard | null>(null);
  const [shown, setShown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [history, setHistory] = useState<QCard[]>([]);
  const [error, setError] = useState("");
  const startedAt = useRef(0);

  // (Re)load the queue whenever the filters change; the filter handlers set `loading`.
  useEffect(() => {
    let cancelled = false;
    const qs = new URLSearchParams({ mode, ...(deck && { deck }), ...(section && { section }), ...(initial.topic && { topic: initial.topic }) });
    api<{ cards: QCard[] }>(`review?${qs}`)
      .then((r) => {
        if (cancelled) return;
        setQueue(r.cards.slice(1));
        setCurrent(r.cards[0] ?? null);
        setLearning([]);
        setHistory([]);
        setDone(0);
        setShown(false);
        setError("");
        startedAt.current = Date.now();
      })
      .catch((err) => !cancelled && setError(errMsg(err)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [mode, deck, section, initial.topic]);

  const filter = (set: (v: string) => void) => (v: string) => {
    setLoading(true);
    set(v);
  };

  /** The next card: a learning card that has come due, else the queue, else the soonest learning card. */
  function advance(q: QCard[], l: { card: QCard; due: number }[]) {
    const now = Date.now();
    const sorted = [...l].sort((a, b) => a.due - b.due);
    let next: QCard | null = null;
    if (sorted.length && (sorted[0].due <= now || !q.length)) {
      next = sorted[0].card;
      sorted.shift();
    } else if (q.length) {
      next = q[0];
      q = q.slice(1);
    }
    setQueue(q);
    setLearning(sorted);
    setCurrent(next);
    setShown(false);
    startedAt.current = Date.now();
  }

  async function grade(r: 1 | 2 | 3 | 4) {
    if (!current || busy) return;
    setBusy(true);
    setError("");
    try {
      let l = learning;
      let q = queue;
      if (mode === "cram") {
        if (r === 1) q = [...q, current];
      } else {
        const res = await api<{ due: string; previews: QCard["previews"] }>("review", "POST", {
          card_id: current.id,
          rating: r,
          duration_ms: Date.now() - startedAt.current,
        });
        const due = Date.parse(res.due);
        if (due - Date.now() < RELEARN_WINDOW_MS) l = [...l, { card: { ...current, previews: res.previews, state: 1 }, due }];
      }
      setHistory((h) => [...h, current]);
      setDone((d) => d + 1);
      advance(q, l);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  async function undo() {
    const last = history[history.length - 1];
    if (!last || busy) return;
    setBusy(true);
    try {
      if (mode !== "cram") await api("review/undo", "POST");
      setHistory((h) => h.slice(0, -1));
      setLearning((l) => l.filter((x) => x.card.id !== last.id));
      setQueue((q) => (current ? [current, ...q.filter((c) => c.id !== last.id)] : q.filter((c) => c.id !== last.id)));
      setCurrent(last);
      setShown(false);
      setDone((d) => Math.max(0, d - 1));
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  async function toggle(field: "flagged" | "suspended") {
    if (!current) return;
    const value = field === "flagged" ? !current.flagged : true;
    await api(`cards/${current.id}`, "PATCH", { [field]: value }).catch((err) => setError(errMsg(err)));
    if (field === "suspended") advance(queue, learning);
    else setCurrent({ ...current, flagged: value ? 1 : 0 });
  }

  // Keyboard: space/enter shows the answer, 1–4 grade, z undoes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea, select")) return;
      if ((e.key === " " || e.key === "Enter") && current && !shown) {
        e.preventDefault();
        setShown(true);
      } else if (shown && ["1", "2", "3", "4"].includes(e.key)) {
        grade(Number(e.key) as 1 | 2 | 3 | 4);
      } else if (e.key === " " && shown) {
        e.preventDefault();
        grade(3);
      } else if (e.key === "z" || e.key === "Z") {
        undo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const remaining = queue.length + learning.length + (current ? 1 : 0);
  // A cloze reveals in place; a basic card shows its back below.
  const front = current ? (current.kind === "cloze" ? renderCloze(current.front, current.cloze_index, shown) : render(current.front)) : "";
  const back = current?.back ? render(current.back) : "";
  const t = topic(current?.topic_id);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-xl font-medium text-prose">Review</h1>
        <select value={mode} onChange={(e) => filter(setMode)(e.target.value)} className={inputCls} aria-label="Mode">
          {MODES.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
        <select value={deck} onChange={(e) => filter(setDeck)(e.target.value)} className={`${inputCls} max-w-[11rem]`} aria-label="Deck">
          <option value="">All decks</option>
          {decks.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <SectionSelect value={section} onChange={filter(setSection)} emptyLabel="All sections" className="max-w-[9rem]" />
      </div>

      {!sessionOpen && (
        <p className="mb-4 text-xs text-faint">
          Reviews aren&apos;t timed toward your study hours.{" "}
          <button
            className="underline hover:text-prose"
            onClick={async () => {
              await startSession({});
              router.refresh();
            }}
          >
            Start a study session
          </button>{" "}
          to count this time.
        </p>
      )}

      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

      {loading ? (
        <p className="py-16 text-center text-sm text-faint">Loading cards…</p>
      ) : !current ? (
        <div className="rounded-lg border border-line bg-surface px-6 py-16 text-center">
          <p className="text-lg text-prose">{done ? `Done! ${done} cards reviewed.` : "No cards to review here."}</p>
          <p className="mt-1 text-sm text-faint">
            {mode === "due" ? "Come back when more are due, or try Struggling or Cram mode." : "Try another deck or section."}
          </p>
          {history.length > 0 && (
            <button onClick={undo} className={`${quietBtnCls} mt-4`}>
              Undo last
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="mb-2 flex items-center gap-3 text-xs text-faint">
            <span>
              {remaining} left · {done} done
            </span>
            <span className="truncate">
              {current.deck_name}
              {t ? ` · ${t.id} ${t.name}` : ""}
              {current.state === 0 ? " · new" : ""}
            </span>
            <span className="ml-auto flex gap-3">
              <button onClick={() => toggle("flagged")} className={current.flagged ? "text-[#c98500]" : "hover:text-prose"} title="Flag for editing">
                {current.flagged ? "⚑ flagged" : "⚐ flag"}
              </button>
              <button onClick={() => toggle("suspended")} className="hover:text-prose" title="Stop showing this card">
                suspend
              </button>
              {history.length > 0 && (
                <button onClick={undo} className="hover:text-prose" title="Undo (Z)">
                  ↶ undo
                </button>
              )}
            </span>
          </div>
          <div className="flex min-h-[320px] flex-col rounded-lg border border-line bg-surface">
            <div className="card-body px-6 py-8 text-center text-lg text-prose sm:px-10" dangerouslySetInnerHTML={{ __html: front }} />
            {shown && (back || current.extra) && (
              <div className="animate-fade-up border-t border-line px-6 py-6 text-center sm:px-10">
                {back && <div className="card-body text-lg text-subtle" dangerouslySetInnerHTML={{ __html: back }} />}
                {current.extra && <div className="card-body mt-3 text-sm text-faint" dangerouslySetInnerHTML={{ __html: render(current.extra) }} />}
              </div>
            )}
          </div>
          <div className="mt-4">
            {!shown ? (
              <button onClick={() => setShown(true)} className="w-full rounded-lg border border-accent bg-accent-dim py-3 text-sm text-prose hover:bg-accent">
                Show answer <span className="text-faint">(space)</span>
              </button>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {GRADES.map((g) => (
                  <button key={g.r} disabled={busy} onClick={() => grade(g.r)} className={`rounded-lg border bg-surface py-2.5 text-sm text-prose transition-colors ${g.cls}`}>
                    {g.label}
                    <span className="block text-[11px] text-faint">{mode === "cram" ? g.r : `${current.previews[g.r]} · ${g.r}`}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className={`${labelCls} mt-4 text-center normal-case tracking-normal`}>Space to flip · 1–4 to grade · Z to undo</p>
        </>
      )}
    </div>
  );
}
