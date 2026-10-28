import type { Metadata } from "next";
import { all } from "../../../lib/db";
import { today, type Task } from "../../../lib/queries";
import { getSettings } from "../../../lib/settings";
import ScheduleClient from "./ScheduleClient";

export const metadata: Metadata = { title: "Schedule" };
export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const settings = await getSettings();
  const tasks = await all<Task>("SELECT * FROM tasks ORDER BY date, COALESCE(start_min, 9999), id");
  return <ScheduleClient tasks={tasks} today={today(settings)} examDate={settings.exam_date} dayStart={settings.day_start_min} />;
}
