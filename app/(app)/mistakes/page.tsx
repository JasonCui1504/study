import type { Metadata } from "next";
import { all } from "../../../lib/db";
import { today } from "../../../lib/queries";
import { getSettings } from "../../../lib/settings";
import MistakesClient, { type Mistake } from "./MistakesClient";

export const metadata: Metadata = { title: "Mistake log" };
export const dynamic = "force-dynamic";

export default async function MistakesPage({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const { topic } = await searchParams;
  const settings = await getSettings();
  const mistakes = await all<Mistake>("SELECT * FROM mistakes ORDER BY date DESC, id DESC");
  return <MistakesClient mistakes={mistakes} today={today(settings)} initialTopic={topic ?? ""} />;
}
