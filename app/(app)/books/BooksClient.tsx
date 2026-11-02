"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BOOK_STATUSES, type BookStatus } from "../../../lib/book-status";
import type { Book, BookSection, Chapter } from "../../../lib/books";
import { sectionColor, sectionShort } from "../../../lib/sections";
import { parseToc } from "../../../lib/toc";
import BookBar from "../../components/BookBar";
import Modal from "../../components/Modal";
import SectionSelect from "../../components/SectionSelect";
import StatusControl from "../../components/StatusControl";
import { api, btnCls, errMsg, ghostCls, inputCls, labelCls, panelCls, quietBtnCls } from "../../ui";

const count = (chs: Chapter[], s: BookStatus) => chs.filter((c) => c.status === s).length;

/**
 * Review books (the Princeton Review series, or any other) with their
 * chapters and sections. Mark each one "Haven't started", "Still learning" or
 * "Mastered"; mastered ones are crossed off.
 */
export default function BooksClient({ books: initial, initialBook }: { books: Book[]; initialBook: number | null }) {
  const router = useRouter();
  const [books, setBooks] = useState(initial);
  const [prev, setPrev] = useState(initial);
  if (initial !== prev) {
    setPrev(initial);
    setBooks(initial);
  }
  const [selected, setSelected] = useState<number | null>(initialBook ?? initial[0]?.id ?? null);
  const [hideMastered, setHideMastered] = useState(false);
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const [importing, setImporting] = useState(false);
  const [editingBook, setEditingBook] = useState<Partial<Book> | null>(null);
  const [error, setError] = useState("");

  const book = books.find((b) => b.id === selected) ?? books[0] ?? null;
  const all = books.flatMap((b) => b.chapters);

  /** Optimistic local change, then save and re-sync with the server. */
  async function mutate(local: (bs: Book[]) => Book[], save: () => Promise<unknown>) {
    const before = books;
    setBooks(local(books));
    setError("");
    try {
      await save();
      router.refresh();
    } catch (err) {
      setBooks(before);
      setError(errMsg(err));
    }
  }
  const mapChapter = (id: number, f: (c: Chapter) => Chapter) => (bs: Book[]) =>
    bs.map((b) => ({ ...b, chapters: b.chapters.map((c) => (c.id === id ? f(c) : c)) }));

  function setChapterStatus(c: Chapter, status: BookStatus) {
    // Mastering a chapter crosses off all its sections too.
    const cascade = status === "mastered" && c.sections.length > 0;
    mutate(
      mapChapter(c.id, (x) => ({ ...x, status, sections: cascade ? x.sections.map((s) => ({ ...s, status })) : x.sections })),
      () => api(`chapters/${c.id}`, "PATCH", { status, cascade })
    );
  }

  function setSectionStatus(c: Chapter, s: BookSection, status: BookStatus) {
    mutate(
      mapChapter(c.id, (x) => ({ ...x, sections: x.sections.map((y) => (y.id === s.id ? { ...y, status } : y)) })),
      async () => {
        const r = await api<{ chapter_status: BookStatus }>(`book-sections/${s.id}`, "PATCH", { status });
        setBooks((bs) => mapChapter(c.id, (x) => ({ ...x, status: r.chapter_status }))(bs));
      }
    );
  }

  const shown = book ? book.chapters.filter((c) => !hideMastered || c.status !== "mastered") : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <h1 className="text-xl font-medium text-prose">Books</h1>
          <p className="text-sm text-faint">
            {all.length
              ? `${count(all, "mastered")} of ${all.length} chapters mastered · ${count(all, "learning")} still learning`
              : "Add each book's chapters, then cross them off as you master them."}
          </p>
        </div>
        <button onClick={() => setEditingBook({ title: "", section: "" })} className={quietBtnCls}>
          + Book
        </button>
      </div>
      {all.length > 0 && <BookBar total={all.length} mastered={count(all, "mastered")} learning={count(all, "learning")} className="h-2" />}

      <div className="grid gap-5 lg:grid-cols-[17rem_1fr] [&>*]:min-w-0">
        {/* Book list */}
        <nav className="scrollbar-none flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
          {books.map((b) => {
            const on = book?.id === b.id;
            return (
              <button
                key={b.id}
                onClick={() => setSelected(b.id)}
                className={`w-56 shrink-0 rounded-lg border p-3 text-left transition-colors lg:w-auto ${
                  on ? "border-accent/70 bg-lift" : "border-line bg-surface hover:border-faint/60"
                }`}
              >
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-faint">
                  <span className="h-2 w-2 rounded-full" style={{ background: sectionColor(b.section) }} />
                  {sectionShort(b.section)}
                  <span className="ml-auto normal-case tracking-normal tabular-nums">
                    {count(b.chapters, "mastered")}/{b.chapters.length}
                  </span>
                </div>
                <p className={`mt-1 text-sm leading-snug ${on ? "text-prose" : "text-subtle"}`}>{b.title.replace(/^MCAT /, "")}</p>
                <BookBar total={b.chapters.length} mastered={count(b.chapters, "mastered")} learning={count(b.chapters, "learning")} className="mt-2" />
              </button>
            );
          })}
        </nav>

        {/* Selected book */}
        {book ? (
          <section className={panelCls}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: sectionColor(book.section) }} />
              <h2 className="text-base font-medium text-prose">{book.title}</h2>
              <button onClick={() => setEditingBook(book)} className={ghostCls}>
                edit
              </button>
              <div className="ml-auto flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-subtle">
                  <input type="checkbox" checked={hideMastered} onChange={(e) => setHideMastered(e.target.checked)} className="accent-[#4a7c59]" />
                  Hide mastered
                </label>
                <button onClick={() => setImporting(true)} className={quietBtnCls}>
                  Paste table of contents
                </button>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 text-xs text-faint">
              {BOOK_STATUSES.map((s) => (
                <span key={s.id} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                  {count(book.chapters, s.id)} {s.label.toLowerCase()}
                </span>
              ))}
            </div>
            {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

            <ul className="mt-4 divide-y divide-line border-y border-line">
              {shown.map((c) => (
                <ChapterRow
                  key={c.id}
                  chapter={c}
                  open={!!open[c.id]}
                  onToggle={() => setOpen({ ...open, [c.id]: !open[c.id] })}
                  onStatus={(s) => setChapterStatus(c, s)}
                  onSectionStatus={(s, st) => setSectionStatus(c, s, st)}
                  onError={setError}
                />
              ))}
              {!book.chapters.length && (
                <li className="py-8 text-center text-sm text-faint">
                  No chapters yet. Paste the table of contents, or add chapters one at a time below.
                </li>
              )}
              {book.chapters.length > 0 && !shown.length && <li className="py-6 text-center text-sm text-faint">Every chapter is mastered. 🎉</li>}
            </ul>
            <AddRow
              placeholder="Add a chapter, e.g. 4 Enzymes"
              onAdd={async (text) => {
                const [, number = "", title = text] = text.match(/^(?:chapter\s*)?(\d+)[.:)]?\s+(.+)$/i) ?? [];
                await api("chapters", "POST", { book_id: book.id, number, title });
                router.refresh();
              }}
            />
          </section>
        ) : (
          <p className="text-sm text-faint">No books yet.</p>
        )}
      </div>

      {importing && book && <TocImport book={book} onClose={() => setImporting(false)} />}
      {editingBook && <BookForm book={editingBook} onClose={() => setEditingBook(null)} onCreated={(id) => setSelected(id)} />}
    </div>
  );
}

function ChapterRow({
  chapter: c,
  open,
  onToggle,
  onStatus,
  onSectionStatus,
  onError,
}: {
  chapter: Chapter;
  open: boolean;
  onToggle: () => void;
  onStatus: (s: BookStatus) => void;
  onSectionStatus: (s: BookSection, st: BookStatus) => void;
  onError: (msg: string) => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [number, setNumber] = useState(c.number);
  const [title, setTitle] = useState(c.title);
  const mastered = c.status === "mastered";
  const secDone = c.sections.filter((s) => s.status === "mastered").length;

  async function save() {
    try {
      await api(`chapters/${c.id}`, "PATCH", { number, title });
      setEditing(false);
      router.refresh();
    } catch (err) {
      onError(errMsg(err));
    }
  }

  return (
    <li className="py-2.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <button onClick={onToggle} className={`w-4 text-[10px] text-faint transition-transform hover:text-prose ${open ? "" : "-rotate-90"}`} aria-label={open ? "Hide sections" : "Show sections"}>
          ▾
        </button>
        {editing ? (
          <form
            className="flex min-w-[11rem] flex-1 gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <input value={number} onChange={(e) => setNumber(e.target.value)} className={`${inputCls} w-14`} placeholder="#" aria-label="Chapter number" />
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={`${inputCls} min-w-0 flex-1`} autoFocus aria-label="Chapter title" />
            <button className={ghostCls}>save</button>
            <button
              type="button"
              onClick={async () => {
                if (!confirm(`Delete “${c.title}” and its sections?`)) return;
                await api(`chapters/${c.id}`, "DELETE").catch((err) => onError(errMsg(err)));
                router.refresh();
              }}
              className="text-xs text-faint hover:text-red-400"
            >
              delete
            </button>
          </form>
        ) : (
          <button onClick={onToggle} onDoubleClick={() => setEditing(true)} className="flex min-w-[11rem] flex-1 items-baseline gap-2 text-left">
            {c.number && <span className="w-8 shrink-0 font-mono text-xs tabular-nums text-faint">{c.number}</span>}
            <span className={`min-w-0 text-sm ${mastered ? "text-faint line-through decoration-[#5fb877]/70" : "text-prose"}`}>{c.title}</span>
            {c.sections.length > 0 && (
              <span className="shrink-0 text-[11px] text-faint">
                {secDone}/{c.sections.length}
              </span>
            )}
          </button>
        )}
        {!editing && (
          <button onClick={() => setEditing(true)} className={`${ghostCls} hidden sm:inline`}>
            edit
          </button>
        )}
        <StatusControl value={c.status} onChange={onStatus} label={`Status of ${c.title}`} />
      </div>
      {open && (
        <div className="mt-2 ml-7 border-l border-line pl-4">
          <ul className="space-y-1.5">
            {c.sections.map((s) => (
              <SectionRow key={s.id} section={s} onStatus={(st) => onSectionStatus(s, st)} onError={onError} />
            ))}
          </ul>
          <AddRow
            placeholder="Add a section, e.g. 4.2 Enzyme kinetics"
            small
            onAdd={async (text) => {
              const [, number = "", title = text] = text.match(/^(\d+(?:\.\d+)*)[.:)]?\s+(.+)$/) ?? [];
              await api("book-sections", "POST", { chapter_id: c.id, number, title });
              router.refresh();
            }}
          />
        </div>
      )}
    </li>
  );
}

function SectionRow({ section: s, onStatus, onError }: { section: BookSection; onStatus: (st: BookStatus) => void; onError: (msg: string) => void }) {
  const router = useRouter();
  const mastered = s.status === "mastered";
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="flex min-w-[9rem] flex-1 items-baseline gap-2">
        {s.number && <span className="shrink-0 font-mono text-[11px] tabular-nums text-faint">{s.number}</span>}
        <span className={`min-w-0 text-[13px] ${mastered ? "text-faint line-through decoration-[#5fb877]/70" : "text-subtle"}`}>{s.title}</span>
      </span>
      <button
        onClick={async () => {
          if (!confirm(`Delete section “${s.title}”?`)) return;
          await api(`book-sections/${s.id}`, "DELETE").catch((err) => onError(errMsg(err)));
          router.refresh();
        }}
        className="text-xs text-faint/60 hover:text-red-400"
        aria-label={`Delete ${s.title}`}
      >
        ×
      </button>
      <StatusControl value={s.status} onChange={onStatus} compact label={`Status of ${s.title}`} />
    </li>
  );
}

function AddRow({ placeholder, onAdd, small = false }: { placeholder: string; onAdd: (text: string) => Promise<void>; small?: boolean }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      className={`flex gap-2 ${small ? "mt-2" : "mt-3"}`}
      onSubmit={async (e) => {
        e.preventDefault();
        if (!text.trim()) return;
        setBusy(true);
        setError("");
        try {
          await onAdd(text.trim());
          setText("");
        } catch (err) {
          setError(errMsg(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} className={`${inputCls} min-w-0 flex-1 ${small ? "py-1 text-xs" : ""}`} />
      <button disabled={busy || !text.trim()} className={small ? ghostCls : quietBtnCls}>
        Add
      </button>
      {error && <span className="self-center text-xs text-red-400">{error}</span>}
    </form>
  );
}

function TocImport({ book, onClose }: { book: Book; onClose: () => void }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const toc = parseToc(text);
  const sections = toc.reduce((a, c) => a + c.sections.length, 0);

  return (
    <Modal title={`Table of contents · ${book.title.replace(/^MCAT /, "")}`} onClose={onClose}>
      <div className="space-y-3">
        <p className="text-xs text-faint">
          One per line. <code className="text-subtle">Chapter 3: Enzymes</code> or <code className="text-subtle">3. Enzymes</code> starts a chapter;{" "}
          <code className="text-subtle">3.2 Kinetics</code> or an indented / bulleted line is a section of it. Page numbers are ignored. New chapters are
          added after the existing ones.
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          autoFocus
          className={`${inputCls} w-full font-mono text-xs`}
          placeholder={"Chapter 1: Enzymes\n1.1 Enzyme structure\n1.2 Kinetics\nChapter 2: Metabolism\n  Glycolysis\n  Citric acid cycle"}
        />
        {toc.length > 0 && (
          <div className="max-h-48 overflow-y-auto rounded border border-line bg-canvas p-2 text-xs">
            <p className={`${labelCls} mb-1`}>
              Preview: {toc.length} chapters, {sections} sections
            </p>
            {toc.map((c, i) => (
              <div key={i}>
                <p className="text-prose">
                  {c.number && <span className="mr-2 font-mono text-faint">{c.number}</span>}
                  {c.title}
                </p>
                {c.sections.map((s, j) => (
                  <p key={j} className="ml-6 text-faint">
                    {s.number && <span className="mr-2 font-mono">{s.number}</span>}
                    {s.title}
                  </p>
                ))}
              </div>
            ))}
          </div>
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex gap-2">
          <button
            disabled={busy || !toc.length}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await api(`books/${book.id}/toc`, "POST", { text });
                onClose();
                router.refresh();
              } catch (err) {
                setError(errMsg(err));
                setBusy(false);
              }
            }}
            className={btnCls}
          >
            Add {toc.length || ""} chapters
          </button>
          <button onClick={onClose} className={quietBtnCls}>
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}

function BookForm({ book, onClose, onCreated }: { book: Partial<Book>; onClose: () => void; onCreated: (id: number) => void }) {
  const router = useRouter();
  const [title, setTitle] = useState(book.title ?? "");
  const [section, setSection] = useState(book.section ?? "");
  const [error, setError] = useState("");
  return (
    <Modal title={book.id ? "Edit book" : "Add a book"} onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            if (book.id) await api(`books/${book.id}`, "PATCH", { title, section });
            else onCreated((await api<{ id: number }>("books", "POST", { title, section })).id);
            onClose();
            router.refresh();
          } catch (err) {
            setError(errMsg(err));
          }
        }}
      >
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Kaplan MCAT Biochemistry Review" autoFocus className={`${inputCls} w-full`} />
        <SectionSelect value={section} onChange={setSection} emptyLabel="Mixed sections" className="w-full" />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex items-center gap-2">
          <button disabled={!title.trim()} className={btnCls}>
            Save
          </button>
          <button type="button" onClick={onClose} className={quietBtnCls}>
            Cancel
          </button>
          {book.id && (
            <button
              type="button"
              onClick={async () => {
                if (!confirm(`Delete “${book.title}” with all its chapters and sections?`)) return;
                await api(`books/${book.id}`, "DELETE");
                onClose();
                router.refresh();
              }}
              className="ml-auto text-xs text-faint hover:text-red-400"
            >
              Delete book
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}
