import { NextRequest } from "next/server";
import { STUDY_COOKIE, validCalendarToken, verifySessionToken } from "../../../lib/auth";
import { KIND_LABELS, type TaskKind } from "../../../lib/planner";
import { today } from "../../../lib/queries";
import { all } from "../../../lib/db";
import { sectionShort } from "../../../lib/sections";
import { getSettings } from "../../../lib/settings";
import { addDays } from "../../../lib/time";
import type { Task } from "../../../lib/queries";

// The study plan as an iCalendar feed for Google/Apple Calendar, readable
// with the token in the link (calendar apps can't sign in). Timed blocks are
// pinned to the study time zone; untimed ones are all-day.

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const ymd = (d: string) => d.replace(/-/g, "");

/** Lines over 75 bytes continue on the next line after a space (RFC 5545). */
function fold(line: string): string {
  const out: string[] = [];
  let cur = "";
  for (const ch of line) {
    if (Buffer.byteLength(cur + ch) > (out.length ? 74 : 75)) {
      out.push(cur);
      cur = "";
    }
    cur += ch;
  }
  out.push(cur);
  return out.join("\r\n ");
}

export async function GET(request: NextRequest) {
  const signedIn = verifySessionToken(request.cookies.get(STUDY_COOKIE)?.value);
  if (!signedIn && !validCalendarToken(request.nextUrl.searchParams.get("token"))) {
    return new Response("Not found", { status: 404 });
  }
  const settings = await getSettings();
  const tz = settings.time_zone;
  // A rolling window: the last two weeks and everything ahead.
  const tasks = await all<Task>("SELECT * FROM tasks WHERE date >= ? ORDER BY date, start_min", [addDays(today(settings), -14)]);
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const host = "study.jascui.com";
  const at = (date: string, min: number) => {
    const d = min >= 1440 ? addDays(date, 1) : date;
    const m = min % 1440;
    return `;TZID=${tz}:${ymd(d)}T${String(Math.floor(m / 60)).padStart(2, "0")}${String(m % 60).padStart(2, "0")}00`;
  };
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//jascui.com//MCAT study plan//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:MCAT study plan",
    `X-WR-TIMEZONE:${tz}`,
    "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
    "X-PUBLISHED-TTL:PT6H",
  ];
  for (const t of tasks) {
    const label = KIND_LABELS[t.kind as TaskKind] ?? "Study";
    const summary = `${t.done ? "✓ " : ""}${t.section ? `[${sectionShort(t.section)}] ` : ""}${t.title}`;
    lines.push(
      "BEGIN:VEVENT",
      `UID:task-${t.id}@${host}`,
      `DTSTAMP:${stamp}`,
      ...(t.start_min == null
        ? [`DTSTART;VALUE=DATE:${ymd(t.date)}`, `DTEND;VALUE=DATE:${ymd(addDays(t.date, 1))}`, "TRANSP:TRANSPARENT"]
        : [`DTSTART${at(t.date, t.start_min)}`, `DTEND${at(t.date, t.start_min + t.duration_min)}`]),
      `SUMMARY:${esc(summary)}`,
      `DESCRIPTION:${esc([label, t.notes].filter(Boolean).join("\n"))}`,
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");
  return new Response(lines.map(fold).join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `${request.nextUrl.searchParams.has("download") ? "attachment" : "inline"}; filename="mcat-study-plan.ics"`,
      "Cache-Control": "private, max-age=300",
      "X-Robots-Tag": "noindex",
    },
  });
}
