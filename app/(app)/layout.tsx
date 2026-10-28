import Header from "../components/Header";
import { getOpenSession } from "../../lib/open-session";
import { requireUser } from "../../lib/session-user";
import { getSettings } from "../../lib/settings";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  const [open, settings] = await Promise.all([getOpenSession(), getSettings()]);
  return (
    <>
      <Header open={open} timeZone={settings.time_zone} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-16 sm:px-6 sm:pt-8">{children}</main>
      <footer className="border-t border-line py-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6">
          <span className="text-xs uppercase tracking-widest text-faint">Jason Cui · MCAT</span>
          <a href="https://jascui.com" className="text-xs text-faint transition-colors hover:text-prose">
            jascui.com
          </a>
        </div>
      </footer>
    </>
  );
}
