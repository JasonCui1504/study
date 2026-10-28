"use client";

import Link from "next/link";
import { useState } from "react";
import { OUTLINE } from "../../../lib/outline";
import { SECTIONS } from "../../../lib/sections";
import { hm } from "../../../lib/time";
import { api, errMsg } from "../../ui";

type Rating = { confidence: number; done: boolean };

const CONF_LABELS = ["", "Lost", "Shaky", "Okay", "Solid", "Mastered"];
const CONF_COLORS = ["", "#d95926", "#c98500", "#8aa498", "#3f8f56", "#5fb877"];

/**
 * The AAMC content outline. Rate each topic 1–5 and tick it off once its
 * content is reviewed; ratings steer the planner toward weak topics.
 */
export default function OutlineClient({
  ratings: initial,
  cards,
  mistakes,
  minutes,
}: {
  ratings: Record<string, Rating>;
  cards: Record<string, number>;
  mistakes: Record<string, number>;
  minutes: Record<string, number>;
}) {
  const [ratings, setRatings] = useState(initial);
  const [section, setSection] = useState<string>("bb");
  const [weakFirst, setWeakFirst] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");

  async function save(topicId: string, patch: Partial<Rating>) {
    const before = ratings;
    setRatings((r) => ({ ...r, [topicId]: { ...(r[topicId] ?? { confidence: 0, done: false }), ...patch } }));
    try {
      await api("topics", "PATCH", {
        topic_id: topicId,
        ...("confidence" in patch && { confidence: patch.confidence }),
        ...("done" in patch && { content_done: patch.done }),
      });
    } catch (err) {
      setRatings(before);
      setError(errMsg(err));
    }
  }

  const cats = OUTLINE.filter((c) => c.section === section);
  const allTopics = OUTLINE.flatMap((c) => c.topics);
  const rated = allTopics.filter((t) => ratings[t.id]?.confidence).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <h1 className="text-xl font-medium text-prose">Content outline</h1>
          <p className="text-sm text-faint">
            Rate every topic 1–5. The planner gives weak topics more time. {rated}/{allTopics.length} rated.
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs text-subtle">
          <input type="checkbox" checked={weakFirst} onChange={(e) => setWeakFirst(e.target.checked)} className="accent-[#4a7c59]" />
          Weakest first
        </label>
      </div>
      <div className="flex gap-1 overflow-x-auto border-b border-line">
        {SECTIONS.map((s) => {
          const ts = OUTLINE.filter((c) => c.section === s.id).flatMap((c) => c.topics);
          const done = ts.filter((t) => ratings[t.id]?.done).length;
          return (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={`-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2 text-sm ${section === s.id ? "text-prose" : "border-transparent text-faint hover:text-subtle"}`}
              style={section === s.id ? { borderColor: s.color } : undefined}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
              {s.short}
              <span className="text-[11px] text-faint">
                {done}/{ts.length}
              </span>
            </button>
          );
        })}
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="space-y-3">
        {cats.map((c) => {
          const scored = c.topics.map((t) => ratings[t.id]?.confidence ?? 0).filter(Boolean);
          const avg = scored.length ? scored.reduce((a, b) => a + b, 0) / scored.length : 0;
          const done = c.topics.filter((t) => ratings[t.id]?.done).length;
          const isOpen = open[c.id] ?? true;
          const topics = weakFirst ? [...c.topics].sort((a, b) => (ratings[a.id]?.confidence || 3) - (ratings[b.id]?.confidence || 3)) : c.topics;
          return (
            <section key={c.id} className="rounded-lg border border-line bg-surface">
              <button onClick={() => setOpen({ ...open, [c.id]: !isOpen })} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                <span className="w-10 shrink-0 font-mono text-xs text-faint">{c.id}</span>
                <span className="flex-1 text-sm text-prose">{c.name}</span>
                <span className="hidden text-xs text-faint sm:inline">
                  {done}/{c.topics.length} reviewed{avg ? ` · avg ${avg.toFixed(1)}` : ""}
                </span>
                <span className={`text-[10px] text-faint transition-transform ${isOpen ? "" : "-rotate-90"}`}>▾</span>
              </button>
              {isOpen && (
                <ul className="divide-y divide-line border-t border-line">
                  {topics.map((t) => {
                    const r = ratings[t.id] ?? { confidence: 0, done: false };
                    return (
                      <li key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2">
                        <input
                          type="checkbox"
                          checked={r.done}
                          onChange={(e) => save(t.id, { done: e.target.checked })}
                          className="h-4 w-4 accent-[#4a7c59]"
                          title="Content reviewed"
                          aria-label={`${t.name} reviewed`}
                        />
                        <span className="w-10 font-mono text-[11px] text-faint">{t.id}</span>
                        <span className={`min-w-0 flex-1 text-sm ${r.done ? "text-subtle" : "text-prose"}`}>{t.name}</span>
                        <span className="flex items-center gap-2 text-[11px] text-faint">
                          {cards[t.id] ? (
                            <Link href={`/review?topic=${t.id}&mode=cram`} className="hover:text-prose" title="Cram this topic's cards">
                              {cards[t.id]} cards
                            </Link>
                          ) : null}
                          {mistakes[t.id] ? <Link href={`/mistakes?topic=${t.id}`} className="text-[#e7a46b] hover:text-prose">{mistakes[t.id]} mistakes</Link> : null}
                          {minutes[t.id] ? <span>{hm(minutes[t.id])}</span> : null}
                        </span>
                        <span className="flex gap-0.5" role="radiogroup" aria-label={`Confidence in ${t.name}`}>
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button
                              key={n}
                              role="radio"
                              aria-checked={r.confidence === n}
                              onClick={() => save(t.id, { confidence: r.confidence === n ? 0 : n })}
                              title={CONF_LABELS[n]}
                              className="h-6 w-6 rounded-sm border text-[11px] tabular-nums transition-colors"
                              style={
                                r.confidence >= n
                                  ? { background: `${CONF_COLORS[r.confidence]}55`, borderColor: CONF_COLORS[r.confidence], color: "#deeade" }
                                  : { borderColor: "#243028", color: "#8aa498" }
                              }
                            >
                              {n}
                            </button>
                          ))}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>
      <p className="text-xs text-faint">
        1 Lost · 2 Shaky · 3 Okay · 4 Solid · 5 Mastered. After changing ratings, rebuild your plan on the Schedule page to rebalance it.
      </p>
    </div>
  );
}
