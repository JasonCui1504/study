"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { CardRow } from "../../../../lib/cards";
import { plain } from "../../../../lib/markup";
import { topic } from "../../../../lib/outline";
import { sectionColor } from "../../../../lib/sections";
import CardEditor, { emptyDraft, type CardDraft } from "../../../components/CardEditor";
import SectionSelect from "../../../components/SectionSelect";
import { api, btnCls, errMsg, ghostCls, inputCls, labelCls, panelCls, quietBtnCls } from "../../../ui";

type Deck = { id: number; name: string; section: string; description: string };
const FILTERS = ["all", "due", "new", "flagged", "suspended"] as const;

function status(c: CardRow, now: string): string {
  if (c.suspended) return "suspended";
  if (c.state === 0) return "new";
  if (c.due <= now) return "due now";
  const days = Math.round((Date.parse(c.due) - Date.parse(now)) / 86_400_000);
  return days < 1 ? "due today" : `in ${days}d`;
}

export default function DeckClient({ deck, cards, decks, now }: { deck: Deck; cards: CardRow[]; decks: { id: number; name: string }[]; now: string }) {
  const [tab, setTab] = useState<"cards" | "add" | "import">(cards.length ? "cards" : "add");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [editDeck, setEditDeck] = useState(false);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cards.filter((c) => {
      if (filter === "due" && !(c.state !== 0 && !c.suspended && c.due <= now)) return false;
      if (filter === "new" && !(c.state === 0 && !c.suspended)) return false;
      if (filter === "flagged" && !c.flagged) return false;
      if (filter === "suspended" && !c.suspended) return false;
      return !q || `${c.front} ${c.back} ${c.tags} ${c.extra}`.toLowerCase().includes(q);
    });
  }, [cards, filter, search, now]);

  return (
    <div className="space-y-5">
      <div>
        <Link href="/decks" className={ghostCls}>
          ← Decks
        </Link>
        {editDeck ? (
          <DeckForm deck={deck} onDone={() => setEditDeck(false)} />
        ) : (
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: sectionColor(deck.section) }} />
            <h1 className="text-xl font-medium text-prose">{deck.name}</h1>
            <button onClick={() => setEditDeck(true)} className={ghostCls}>
              edit
            </button>
            <Link href={`/review?deck=${deck.id}`} className={`${btnCls} ml-auto`}>
              Study this deck
            </Link>
            <Link href={`/review?deck=${deck.id}&mode=cram`} className={quietBtnCls}>
              Cram
            </Link>
          </div>
        )}
        {!editDeck && deck.description && <p className="mt-1 text-sm text-faint">{deck.description}</p>}
      </div>

      <div className="flex gap-1 border-b border-line">
        {(["cards", "add", "import"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm capitalize ${tab === t ? "border-accent text-prose" : "border-transparent text-faint hover:text-subtle"}`}
          >
            {t === "cards" ? `Cards (${cards.length})` : t === "add" ? "Add card" : "Import"}
          </button>
        ))}
      </div>

      {tab === "add" && <AddCard deck={deck} />}
      {tab === "import" && <Import deck={deck} onDone={() => setTab("cards")} />}
      {tab === "cards" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search cards" className={`${inputCls} w-full sm:w-64`} />
            <div className="flex gap-1">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded px-2.5 py-1 text-xs capitalize ${filter === f ? "bg-lift text-prose" : "text-faint hover:text-subtle"}`}
                >
                  {f}
                </button>
              ))}
            </div>
            <span className="ml-auto text-xs text-faint">{shown.length} shown</span>
          </div>
          <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
            {shown.slice(0, 300).map((c) =>
              editing === c.id ? (
                <li key={c.id} className="p-4">
                  <EditCard card={c} decks={decks} section={deck.section} onDone={() => setEditing(null)} />
                </li>
              ) : (
                <li key={c.id}>
                  <button onClick={() => setEditing(c.id)} className="flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-lift/40">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-prose">
                        {c.kind === "cloze" && <span className="mr-1 text-[10px] text-[#7cc4ff]">c{c.cloze_index}</span>}
                        {plain(c.front)}
                      </p>
                      <p className="truncate text-xs text-faint">{plain(c.back) || "—"}</p>
                    </div>
                    <div className="shrink-0 text-right text-[11px] text-faint">
                      <p className={c.suspended ? "text-[#d95926]" : status(c, now) === "due now" ? "text-subtle" : ""}>
                        {c.flagged ? "⚑ " : ""}
                        {status(c, now)}
                      </p>
                      {c.topic_id && <p>{topic(c.topic_id)?.id}</p>}
                    </div>
                  </button>
                </li>
              )
            )}
            {!shown.length && <li className="px-4 py-6 text-center text-sm text-faint">No cards match.</li>}
          </ul>
          {shown.length > 300 && <p className="text-xs text-faint">Showing the first 300. Search to narrow down.</p>}
        </div>
      )}
    </div>
  );
}

function DeckForm({ deck, onDone }: { deck: Deck; onDone: () => void }) {
  const router = useRouter();
  const [name, setName] = useState(deck.name);
  const [section, setSection] = useState(deck.section);
  const [description, setDescription] = useState(deck.description);
  const [error, setError] = useState("");
  return (
    <form
      className={`${panelCls} mt-2 space-y-2`}
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await api(`decks/${deck.id}`, "PATCH", { name, section, description });
          onDone();
          router.refresh();
        } catch (err) {
          setError(errMsg(err));
        }
      }}
    >
      <input value={name} onChange={(e) => setName(e.target.value)} className={`${inputCls} w-full`} />
      <SectionSelect value={section} onChange={setSection} emptyLabel="Mixed sections" className="w-full" />
      <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className={`${inputCls} w-full`} />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button className={btnCls}>Save</button>
        <button type="button" onClick={onDone} className={quietBtnCls}>
          Cancel
        </button>
        <button
          type="button"
          onClick={async () => {
            if (!confirm(`Delete "${deck.name}" and all its cards? This can't be undone.`)) return;
            await api(`decks/${deck.id}`, "DELETE");
            router.push("/decks");
          }}
          className="ml-auto text-xs text-faint hover:text-red-400"
        >
          Delete deck
        </button>
      </div>
    </form>
  );
}

function AddCard({ deck }: { deck: Deck }) {
  const router = useRouter();
  const [draft, setDraft] = useState<CardDraft>(emptyDraft);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      const r = await api<{ ids: number[] }>("cards", "POST", { deck_id: deck.id, ...draft });
      setMsg(`Added ${r.ids.length} card${r.ids.length > 1 ? "s" : ""}.`);
      // Keep topic and tags for the next card in a batch.
      setDraft({ ...emptyDraft, topic_id: draft.topic_id, tags: draft.tags });
      router.refresh();
    } catch (err) {
      setMsg(errMsg(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={save} className={`${panelCls} space-y-3`}>
      <CardEditor draft={draft} onChange={setDraft} section={deck.section} />
      <div className="flex items-center gap-3">
        <button disabled={busy || !draft.front.trim()} className={btnCls}>
          Add card
        </button>
        {msg && <span className="text-xs text-faint">{msg}</span>}
      </div>
    </form>
  );
}

function EditCard({ card, decks, section, onDone }: { card: CardRow; decks: { id: number; name: string }[]; section: string; onDone: () => void }) {
  const router = useRouter();
  const [draft, setDraft] = useState<CardDraft>({ front: card.front, back: card.back, extra: card.extra, topic_id: card.topic_id ?? "", tags: card.tags });
  const [deckId, setDeckId] = useState(card.deck_id);
  const [error, setError] = useState("");
  async function patch(body: Record<string, unknown>, close = true) {
    try {
      await api(`cards/${card.id}`, "PATCH", body);
      if (close) onDone();
      router.refresh();
    } catch (err) {
      setError(errMsg(err));
    }
  }
  return (
    <div className="space-y-3">
      <CardEditor draft={draft} onChange={setDraft} section={section} />
      <label className="block">
        <span className={labelCls}>Deck</span>
        <select value={deckId} onChange={(e) => setDeckId(Number(e.target.value))} className={`${inputCls} mt-1 w-full`}>
          {decks.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </label>
      <p className="text-xs text-faint">
        Reviewed {card.reps}× · {card.lapses} lapses
        {card.state !== 0 && ` · next due ${new Date(card.due).toLocaleDateString()}`}
      </p>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => patch({ ...draft, deck_id: deckId, flagged: false })} className={btnCls}>
          Save
        </button>
        <button onClick={onDone} className={quietBtnCls}>
          Cancel
        </button>
        <button onClick={() => patch({ suspended: !card.suspended })} className={ghostCls}>
          {card.suspended ? "Unsuspend" : "Suspend"}
        </button>
        <button onClick={() => confirm("Forget this card's review history and make it new again?") && patch({ reset: true })} className={ghostCls}>
          Reset
        </button>
        <button
          onClick={async () => {
            if (!confirm("Delete this card?")) return;
            await api(`cards/${card.id}`, "DELETE").catch((err) => setError(errMsg(err)));
            onDone();
            router.refresh();
          }}
          className="ml-auto text-xs text-faint hover:text-red-400"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function Import({ deck, onDone }: { deck: Deck; onDone: () => void }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [skipHeader, setSkipHeader] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className={`${panelCls} space-y-3`}>
      <p className="text-sm text-subtle">
        Paste CSV/TSV (front, back, optional tags), or upload an Anki export (File → Export → <em>Notes in Plain Text</em>). Cloze notes are detected automatically.
      </p>
      <input
        type="file"
        accept=".txt,.csv,.tsv,text/plain,text/csv"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) setText(await f.text());
        }}
        className="block text-sm text-faint file:mr-3 file:rounded file:border file:border-line file:bg-lift file:px-3 file:py-1.5 file:text-sm file:text-prose"
      />
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} className={`${inputCls} w-full font-mono text-xs`} placeholder={"What is the pKa of histidine's side chain?\t~6\nKm is…\tthe [S] at ½Vmax"} />
      <label className="flex items-center gap-2 text-sm text-subtle">
        <input type="checkbox" checked={skipHeader} onChange={(e) => setSkipHeader(e.target.checked)} className="accent-[#4a7c59]" />
        First row is a header
      </label>
      <div className="flex items-center gap-3">
        <button
          disabled={busy || !text.trim()}
          onClick={async () => {
            setBusy(true);
            setMsg("");
            try {
              const r = await api<{ imported: number; cards: number }>("cards/import", "POST", { deck_id: deck.id, text, skip_header: skipHeader });
              setMsg(`Imported ${r.imported} notes as ${r.cards} cards.`);
              setText("");
              router.refresh();
              setTimeout(onDone, 900);
            } catch (err) {
              setMsg(errMsg(err));
            } finally {
              setBusy(false);
            }
          }}
          className={btnCls}
        >
          {busy ? "Importing…" : "Import"}
        </button>
        {msg && <span className="text-xs text-faint">{msg}</span>}
      </div>
    </div>
  );
}
