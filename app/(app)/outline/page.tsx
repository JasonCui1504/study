import type { Metadata } from "next";
import { all } from "../../../lib/db";
import OutlineClient from "./OutlineClient";

export const metadata: Metadata = { title: "Content outline" };
export const dynamic = "force-dynamic";

export default async function OutlinePage() {
  const [ratings, cards, mistakes, minutes] = await Promise.all([
    all<{ topic_id: string; confidence: number; content_done: number }>("SELECT topic_id, confidence, content_done FROM topic_ratings"),
    all<{ topic_id: string; n: number }>("SELECT topic_id, COUNT(*) AS n FROM cards WHERE topic_id IS NOT NULL GROUP BY topic_id"),
    all<{ topic_id: string; n: number }>("SELECT topic_id, COUNT(*) AS n FROM mistakes WHERE topic_id IS NOT NULL GROUP BY topic_id"),
    all<{ topic_id: string; n: number }>("SELECT topic_id, SUM(minutes) AS n FROM sessions WHERE topic_id IS NOT NULL GROUP BY topic_id"),
  ]);
  const map = (rows: { topic_id: string; n: number }[]) => Object.fromEntries(rows.map((r) => [r.topic_id, Number(r.n)]));
  return (
    <OutlineClient
      ratings={Object.fromEntries(ratings.map((r) => [r.topic_id, { confidence: Number(r.confidence), done: !!r.content_done }]))}
      cards={map(cards)}
      mistakes={map(mistakes)}
      minutes={map(minutes)}
    />
  );
}
