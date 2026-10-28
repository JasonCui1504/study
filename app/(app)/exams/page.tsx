import type { Metadata } from "next";
import { all } from "../../../lib/db";
import { today } from "../../../lib/queries";
import { getSettings } from "../../../lib/settings";
import ExamsClient, { type Exam } from "./ExamsClient";

export const metadata: Metadata = { title: "Practice exams" };
export const dynamic = "force-dynamic";

export default async function ExamsPage() {
  const settings = await getSettings();
  const exams = await all<Exam>("SELECT * FROM exams ORDER BY date, id");
  return <ExamsClient exams={exams} today={today(settings)} />;
}
