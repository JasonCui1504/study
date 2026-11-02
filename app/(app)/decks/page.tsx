import type { Metadata } from "next";
import Link from "next/link";
import { all } from "../../../lib/db";
import { sectionColor, sectionShort } from "../../../lib/sections";
import { panelCls } from "../../ui";
import NewDeck from "./NewDeck";

export const metadata: Metadata = { title: "Decks" };
export const dynamic = "force-dynamic";

type DeckRow = { id: number; name: string; section: string; description: string; total: number; fresh: number; due: number; suspended: number };

export default async function DecksPage() {
  const now = new Date().toISOString();
  const decks = await all<DeckRow>(
    `SELECT d.*,
       COUNT(c.id) AS total,
       SUM(c.state = 0 AND c.suspended = 0) AS fresh,
       SUM(c.state != 0 AND c.suspended = 0 AND c.due <= ?) AS due,
       SUM(c.suspended) AS suspended
     FROM decks d LEFT JOIN cards c ON c.deck_id = d.id GROUP BY d.id ORDER BY d.name`,
    [now]
  );
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-xl font-medium text-prose">Decks</h1>
        <Link href="/review" className="rounded border border-accent bg-accent-dim px-3 py-1.5 text-sm text-prose hover:bg-accent">
          Review all due
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {decks.map((d) => (
          <Link key={d.id} href={`/decks/${d.id}`} className={`${panelCls} group block transition-colors hover:border-accent/60`}>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: sectionColor(d.section) }} />
              <span className="text-[11px] uppercase tracking-widest text-faint">{sectionShort(d.section)}</span>
            </div>
            <p className="mt-2 font-medium text-prose group-hover:text-accent">{d.name}</p>
            {d.description && <p className="mt-0.5 line-clamp-2 text-xs text-faint">{d.description}</p>}
            <p className="mt-3 text-xs text-subtle">
              <span className="text-prose tabular-nums">{Number(d.due) || 0}</span> due · <span className="tabular-nums">{Number(d.fresh) || 0}</span> new ·{" "}
              <span className="tabular-nums">{d.total}</span> cards
              {Number(d.suspended) > 0 && <span className="text-faint"> · {d.suspended} suspended</span>}
            </p>
          </Link>
        ))}
        <NewDeck />
      </div>
    </div>
  );
}
