"use client";

import { useState } from "react";
import { clozeNumbers } from "../../lib/cards";
import { render, renderCloze } from "../../lib/markup";
import { inputCls, labelCls } from "../ui";
import TopicSelect from "./TopicSelect";

export type CardDraft = { front: string; back: string; extra: string; topic_id: string; tags: string };

export const emptyDraft: CardDraft = { front: "", back: "", extra: "", topic_id: "", tags: "" };

/** Front/back/extra fields with a live preview; clozes are detected from {{c1::…}}. */
export default function CardEditor({ draft, onChange, section }: { draft: CardDraft; onChange: (d: CardDraft) => void; section?: string }) {
  const [preview, setPreview] = useState(false);
  const clozes = clozeNumbers(draft.front);
  const set = (k: keyof CardDraft) => (e: { target: { value: string } }) => onChange({ ...draft, [k]: e.target.value });

  return (
    <div className="space-y-3">
      <label className="block">
        <span className={labelCls}>Front{clozes.length ? ` · cloze (${clozes.length} card${clozes.length > 1 ? "s" : ""})` : ""}</span>
        <textarea value={draft.front} onChange={set("front")} rows={3} className={`${inputCls} mt-1 w-full`} placeholder="Question, or text with {{c1::clozes}}" />
      </label>
      <label className="block">
        <span className={labelCls}>{clozes.length ? "Back (optional, shown after the answer)" : "Back"}</span>
        <textarea value={draft.back} onChange={set("back")} rows={2} className={`${inputCls} mt-1 w-full`} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={labelCls}>Topic</span>
          <TopicSelect value={draft.topic_id} onChange={(v) => onChange({ ...draft, topic_id: v })} section={section || undefined} className="mt-1 w-full" />
        </label>
        <label className="block">
          <span className={labelCls}>Tags</span>
          <input value={draft.tags} onChange={set("tags")} className={`${inputCls} mt-1 w-full`} placeholder="space separated" />
        </label>
      </div>
      <label className="block">
        <span className={labelCls}>Extra (mnemonic, explanation)</span>
        <input value={draft.extra} onChange={set("extra")} className={`${inputCls} mt-1 w-full`} />
      </label>
      <p className="text-[11px] text-faint">
        **bold** · *italic* · x^{"{2}"} · H_{"{2}"}O · ![](https://image-url) · {"{{c1::answer}}"} or {"{{c1::answer::hint}}"} for clozes ·{" "}
        <button type="button" onClick={() => setPreview(!preview)} className="underline hover:text-prose">
          {preview ? "hide preview" : "preview"}
        </button>
      </p>
      {preview && draft.front && (
        <div className="space-y-2 rounded border border-line bg-canvas p-3 text-center">
          <div className="card-body text-prose" dangerouslySetInnerHTML={{ __html: clozes.length ? renderCloze(draft.front, clozes[0], false) : render(draft.front) }} />
          <div className="border-t border-line pt-2">
            <div
              className="card-body text-subtle"
              dangerouslySetInnerHTML={{ __html: clozes.length ? renderCloze(draft.front, clozes[0], true) + (draft.back ? "<br />" + render(draft.back) : "") : render(draft.back) }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
