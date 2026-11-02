"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { MISTAKE_REASONS } from "../../../lib/mistake-reasons";
import { topic } from "../../../lib/outline";
import { sectionColor, sectionShort } from "../../../lib/sections";
import { niceDate } from "../../../lib/time";
import Modal from "../../components/Modal";
import SectionSelect from "../../components/SectionSelect";
import TopicSelect from "../../components/TopicSelect";
import { api, btnCls, errMsg, ghostCls, inputCls, labelCls, panelCls, quietBtnCls } from "../../ui";

export type Mistake = {
  id: number;
  date: string;
  source: string;
  section: string;
  topic_id: string | null;
  reason: string;
  question: string;
  takeaway: string;
  card_id: number | null;
};

const reasonLabel = (id: string) => MISTAKE_REASONS.find((r) => r.id === id)?.label ?? id;

export default function MistakesClient({ mistakes, today, initialTopic }: { mistakes: Mistake[]; today: string; initialTopic: string }) {
  const [editing, setEditing] = useState<Partial<Mistake> | null>(null);
  const [carding, setCarding] = useState<Mistake | null>(null);
  const [section, setSection] = useState("");
  const [reason, setReason] = useState("");
  const [topicId, setTopicId] = useState(initialTopic);
  const [search, setSearch] = useState("");

  const shown = useMemo(() => {
    const q = search.toLowerCase();
    return mistakes.filter(
      (m) =>
        (!section || m.section === section) &&
        (!reason || m.reason === reason) &&
        (!topicId || m.topic_id === topicId || m.topic_id?.startsWith(`${topicId}.`)) &&
        (!q || `${m.question} ${m.takeaway} ${m.source}`.toLowerCase().includes(q))
    );
  }, [mistakes, section, reason, topicId, search]);

  // What keeps going wrong: counts by reason and by topic.
  const byReason = MISTAKE_REASONS.map((r) => ({ ...r, n: mistakes.filter((m) => m.reason === r.id).length })).filter((r) => r.n);
  const topTopics = Object.entries(
    mistakes.reduce<Record<string, number>>((a, m) => {
      if (m.topic_id) a[m.topic_id] = (a[m.topic_id] ?? 0) + 1;
      return a;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxReason = Math.max(1, ...byReason.map((r) => r.n));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h1 className="text-xl font-medium text-prose">Mistake log</h1>
          <p className="text-sm text-faint">Every missed or guessed question: why you missed it and what to remember.</p>
        </div>
        <button onClick={() => setEditing({ date: today, reason: "content", section, topic_id: topicId || null })} className={btnCls}>
          + Log mistake
        </button>
      </div>

      {mistakes.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          <section className={panelCls}>
            <h2 className={labelCls}>Why you miss questions</h2>
            <ul className="mt-3 space-y-2">
              {byReason.map((r) => (
                <li key={r.id}>
                  <button onClick={() => setReason(reason === r.id ? "" : r.id)} className="w-full text-left">
                    <div className="flex text-xs">
                      <span className={reason === r.id ? "text-prose" : "text-subtle"}>{r.label}</span>
                      <span className="ml-auto tabular-nums text-faint">{r.n}</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-lift">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${(r.n / maxReason) * 100}%` }} />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </section>
          <section className={panelCls}>
            <h2 className={labelCls}>Topics with the most mistakes</h2>
            <ul className="mt-3 space-y-1.5">
              {topTopics.map(([id, n]) => {
                const t = topic(id);
                return (
                  <li key={id}>
                    <button onClick={() => setTopicId(topicId === id ? "" : id)} className="flex w-full items-center gap-2 text-left text-sm">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: sectionColor(t?.section) }} />
                      <span className={`truncate ${topicId === id ? "text-prose" : "text-subtle"}`}>{t ? `${t.id} ${t.name}` : id}</span>
                      <span className="ml-auto tabular-nums text-faint">{n}</span>
                    </button>
                  </li>
                );
              })}
              {!topTopics.length && <li className="text-sm text-faint">Tag mistakes with topics to see patterns.</li>}
            </ul>
          </section>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" className={`${inputCls} w-full sm:w-52`} />
        <SectionSelect value={section} onChange={setSection} emptyLabel="All sections" className="max-w-[10rem]" />
        <select value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls}>
          <option value="">All reasons</option>
          {MISTAKE_REASONS.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
        <TopicSelect value={topicId} onChange={setTopicId} placeholder="All topics" className="max-w-[14rem]" />
      </div>

      <ul className="space-y-2">
        {shown.map((m) => {
          const t = topic(m.topic_id);
          return (
            <li key={m.id} className="rounded-lg border border-line bg-surface p-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-faint">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: sectionColor(m.section) }} />
                  {sectionShort(m.section)}
                </span>
                <span>{niceDate(m.date)}</span>
                {m.source && <span>{m.source}</span>}
                <span className="rounded bg-lift px-1.5 py-0.5 text-subtle">{reasonLabel(m.reason)}</span>
                {t && (
                  <span>
                    {t.id} {t.name}
                  </span>
                )}
                <span className="ml-auto flex gap-3">
                  {m.card_id ? <span className="text-[#7fd49a]">✓ card made</span> : <button onClick={() => setCarding(m)} className={ghostCls}>+ flashcard</button>}
                  <button onClick={() => setEditing(m)} className={ghostCls}>
                    edit
                  </button>
                </span>
              </div>
              {m.question && <p className="mt-2 whitespace-pre-wrap text-sm text-subtle">{m.question}</p>}
              {m.takeaway && <p className="mt-1.5 whitespace-pre-wrap text-sm text-prose">→ {m.takeaway}</p>}
            </li>
          );
        })}
        {!shown.length && <li className="rounded-lg border border-line bg-surface p-6 text-center text-sm text-faint">{mistakes.length ? "No mistakes match." : "No mistakes logged yet. Log every miss when you review practice."}</li>}
      </ul>

      {editing && <MistakeForm mistake={editing} onClose={() => setEditing(null)} />}
      {carding && <CardFromMistake mistake={carding} onClose={() => setCarding(null)} />}
    </div>
  );
}

function MistakeForm({ mistake, onClose }: { mistake: Partial<Mistake>; onClose: () => void }) {
  const router = useRouter();
  const [f, setF] = useState({
    date: mistake.date ?? "",
    source: mistake.source ?? "",
    section: mistake.section ?? "",
    topic_id: mistake.topic_id ?? "",
    reason: mistake.reason ?? "content",
    question: mistake.question ?? "",
    takeaway: mistake.takeaway ?? "",
  });
  const [error, setError] = useState("");
  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (mistake.id) await api(`mistakes/${mistake.id}`, "PATCH", f);
      else await api("mistakes", "POST", f);
      onClose();
      router.refresh();
    } catch (err) {
      setError(errMsg(err));
    }
  }
  return (
    <Modal title={mistake.id ? "Edit mistake" : "Log a mistake"} onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} className={inputCls} />
          <input value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })} placeholder="Source (e.g. FL2 C/P Q14)" className={inputCls} />
          <SectionSelect value={f.section} onChange={(v) => setF({ ...f, section: v, topic_id: "" })} />
          <select value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} className={inputCls}>
            {MISTAKE_REASONS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <TopicSelect value={f.topic_id} onChange={(v) => setF({ ...f, topic_id: v })} section={f.section || undefined} className="w-full" />
        <label className="block">
          <span className={labelCls}>The question / what went wrong</span>
          <textarea value={f.question} onChange={(e) => setF({ ...f, question: e.target.value })} rows={3} className={`${inputCls} mt-1 w-full`} />
        </label>
        <label className="block">
          <span className={labelCls}>Takeaway: what to remember next time</span>
          <textarea value={f.takeaway} onChange={(e) => setF({ ...f, takeaway: e.target.value })} rows={2} className={`${inputCls} mt-1 w-full`} />
        </label>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex items-center gap-2">
          <button className={btnCls}>Save</button>
          <button type="button" onClick={onClose} className={quietBtnCls}>
            Cancel
          </button>
          {mistake.id && (
            <button
              type="button"
              onClick={async () => {
                if (!confirm("Delete this mistake?")) return;
                await api(`mistakes/${mistake.id}`, "DELETE");
                onClose();
                router.refresh();
              }}
              className="ml-auto text-xs text-faint hover:text-red-400"
            >
              Delete
            </button>
          )}
        </div>
        <p className="text-[11px] text-faint">Tip: tag the topic. It shows on the Outline page next to that topic.</p>
      </form>
    </Modal>
  );
}

function CardFromMistake({ mistake, onClose }: { mistake: Mistake; onClose: () => void }) {
  const router = useRouter();
  const [front, setFront] = useState(mistake.question);
  const [back, setBack] = useState(mistake.takeaway);
  const [error, setError] = useState("");
  return (
    <Modal title="Make a flashcard" onClose={onClose}>
      <div className="space-y-3">
        <p className="text-xs text-faint">Goes into the “Mistakes” deck. Rephrase it as a question you can answer from memory.</p>
        <textarea value={front} onChange={(e) => setFront(e.target.value)} rows={3} placeholder="Front" className={`${inputCls} w-full`} />
        <textarea value={back} onChange={(e) => setBack(e.target.value)} rows={2} placeholder="Back" className={`${inputCls} w-full`} />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex gap-2">
          <button
            disabled={!front.trim()}
            onClick={async () => {
              try {
                await api(`mistakes/${mistake.id}/card`, "POST", { front, back });
                onClose();
                router.refresh();
              } catch (err) {
                setError(errMsg(err));
              }
            }}
            className={btnCls}
          >
            Add card
          </button>
          <button onClick={onClose} className={quietBtnCls}>
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}
