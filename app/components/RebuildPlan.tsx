"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, btnCls, errMsg, quietBtnCls } from "../ui";

/** Rebuilds the plan from today (missed generated tasks are redistributed). */
export default function RebuildPlan({ label = "Rebuild plan from today", quiet = false, confirmText }: { label?: string; quiet?: boolean; confirmText?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        disabled={busy}
        onClick={async () => {
          if (confirmText && !confirm(confirmText)) return;
          setBusy(true);
          setMsg("");
          try {
            const r = await api<{ tasks: number }>("plan", "POST");
            setMsg(`Planned ${r.tasks} tasks.`);
            router.refresh();
          } catch (err) {
            setMsg(errMsg(err));
          } finally {
            setBusy(false);
          }
        }}
        className={quiet ? quietBtnCls : btnCls}
      >
        {busy ? "Planning…" : label}
      </button>
      {msg && <span className="text-xs text-faint">{msg}</span>}
    </span>
  );
}
