"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Centered modal on desktop, bottom sheet on phones. Closes on Esc and backdrop click. */
export function FilterModal({
  title = "Filters",
  onClose,
  onApply,
  onReset,
  children,
}: {
  title?: string;
  onClose: () => void;
  onApply: () => void;
  onReset: () => void;
  children: React.ReactNode;
}) {
  React.useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-2xl border bg-card shadow-2xl sm:w-[560px] sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b px-5 py-3.5">
          <h2 className="font-semibold">{title}</h2>
          <button type="button" aria-label="Close filters" onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted">
            <X className="size-5" />
          </button>
        </div>
        <div className="space-y-6 overflow-y-auto px-5 py-5">{children}</div>
        <div className="flex items-center justify-between gap-3 border-t bg-card px-5 py-3.5">
          <Button type="button" variant="ghost" onClick={onReset}>Reset</Button>
          <Button type="button" size="lg" onClick={onApply}>Show results</Button>
        </div>
      </div>
    </div>
  );
}
