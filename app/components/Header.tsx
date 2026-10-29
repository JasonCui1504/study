"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { api } from "../ui";
import StudySession, { type OpenSession } from "./StudySession";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/review", label: "Review" },
  { href: "/decks", label: "Decks" },
  { href: "/books", label: "Books" },
  { href: "/schedule", label: "Schedule" },
  { href: "/outline", label: "Outline" },
  { href: "/exams", label: "Exams" },
  { href: "/mistakes", label: "Mistakes" },
  { href: "/stats", label: "Stats" },
];

export default function Header({ open, timeZone }: { open: OpenSession | null; timeZone: string }) {
  const path = usePathname();

  // "Today" follows the browser's time zone, so keep the saved one in step.
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && tz !== timeZone) api("settings", "PATCH", { time_zone: tz }).catch(() => {});
  }, [timeZone]);

  async function signOut() {
    await api("auth", "DELETE");
    window.location.href = "/login";
  }

  const link = (l: { href: string; label: string }) => {
    const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
    return (
      <Link
        key={l.href}
        href={l.href}
        className={`group relative whitespace-nowrap text-sm tracking-wide transition-colors duration-200 ${active ? "text-accent" : "text-subtle hover:text-prose"}`}
      >
        {l.label}
        <span className={`absolute -bottom-1 left-0 h-px bg-accent transition-all duration-300 ${active ? "w-full" : "w-0 group-hover:w-full"}`} />
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-canvas/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="whitespace-nowrap text-sm font-medium uppercase tracking-widest text-prose transition-colors duration-200 hover:text-accent">
          MCAT<span className="text-faint"> · Study</span>
        </Link>
        <nav className="hidden items-center gap-5 xl:flex">{LINKS.map(link)}</nav>
        <div className="ml-auto flex items-center gap-4">
          <StudySession open={open} compact />
          <Link href="/settings" className={`text-sm ${path.startsWith("/settings") ? "text-accent" : "text-faint hover:text-prose"}`} title="Settings">
            ⚙
          </Link>
          <button onClick={signOut} className="hidden whitespace-nowrap text-xs text-faint hover:text-prose sm:inline">
            Sign out
          </button>
        </div>
      </div>
      <nav className="scrollbar-none flex gap-5 overflow-x-auto border-t border-line px-4 py-2.5 xl:hidden">{LINKS.map(link)}</nav>
    </header>
  );
}
