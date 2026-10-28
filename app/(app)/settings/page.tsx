import type { Metadata } from "next";
import { headers } from "next/headers";
import { calendarToken } from "../../../lib/auth";
import { getSettings } from "../../../lib/settings";
import SettingsClient from "./SettingsClient";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getSettings();
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "study.jascui.com";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return <SettingsClient settings={settings} feedUrl={`${proto}://${host}/api/calendar.ics?token=${calendarToken()}`} />;
}
