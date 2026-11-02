"use client";

import { useEffect } from "react";

export default function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
        className="animate-fade-up max-h-[92vh] w-full overflow-y-auto rounded-t-lg border border-line bg-surface p-5 sm:max-w-lg sm:rounded-lg"
      >
        <div className="mb-4 flex items-center">
          <h2 className="text-base font-medium text-prose">{title}</h2>
          <button onClick={onClose} className="ml-auto text-xl leading-none text-faint hover:text-prose" aria-label="Close">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
