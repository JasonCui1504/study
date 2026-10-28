import type { Metadata } from "next";
import { all } from "../../../lib/db";
import { getOpenSession } from "../../../lib/open-session";
import ReviewClient from "./ReviewClient";

export const metadata: Metadata = { title: "Review" };
export const dynamic = "force-dynamic";

export default async function ReviewPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const q = await searchParams;
  const [decks, open] = await Promise.all([all<{ id: number; name: string }>("SELECT id, name FROM decks ORDER BY name"), getOpenSession()]);
  return (
    <ReviewClient
      decks={decks}
      sessionOpen={!!open}
      initial={{ mode: q.mode ?? "due", deck: q.deck ?? "", section: q.section ?? "", topic: q.topic ?? "" }}
    />
  );
}
