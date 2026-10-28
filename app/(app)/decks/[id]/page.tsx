import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { CardRow } from "../../../../lib/cards";
import { all, one } from "../../../../lib/db";
import DeckClient from "./DeckClient";

export const metadata: Metadata = { title: "Deck" };
export const dynamic = "force-dynamic";

export default async function DeckPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const deck = await one<{ id: number; name: string; section: string; description: string }>("SELECT * FROM decks WHERE id = ?", [id]);
  if (!deck) notFound();
  const [cards, decks] = await Promise.all([
    all<CardRow>("SELECT * FROM cards WHERE deck_id = ? ORDER BY id DESC", [id]),
    all<{ id: number; name: string }>("SELECT id, name FROM decks ORDER BY name"),
  ]);
  return <DeckClient deck={deck} cards={cards} decks={decks} now={new Date().toISOString()} />;
}
