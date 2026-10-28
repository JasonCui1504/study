"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import SectionSelect from "../../components/SectionSelect";
import { api, btnCls, errMsg, inputCls } from "../../ui";

export default function NewDeck() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [section, setSection] = useState("");
  const [error, setError] = useState("");
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="rounded-lg border border-dashed border-line p-5 text-sm text-faint transition-colors hover:border-accent hover:text-prose">
        + New deck
      </button>
    );
  }
  return (
    <form
      className="space-y-2 rounded-lg border border-line bg-surface p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          const { id } = await api<{ id: number }>("decks", "POST", { name, section });
          router.push(`/decks/${id}`);
        } catch (err) {
          setError(errMsg(err));
        }
      }}
    >
      <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Deck name" className={`${inputCls} w-full`} />
      <SectionSelect value={section} onChange={setSection} emptyLabel="Mixed sections" className="w-full" />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button disabled={!name.trim()} className={btnCls}>
          Create
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-faint hover:text-prose">
          Cancel
        </button>
      </div>
    </form>
  );
}
