"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";

/** Catalogue filters: always visible on desktop, collapsed behind a button on small screens so results come first. */
export function FilterPanel({ children, activeCount }: { children: React.ReactNode; activeCount: number }) {
  const [open, setOpen] = useState(false);
  return (
    <aside className="min-w-0 lg:col-span-1" aria-label="Filters">
      <button type="button" className="btn-outline w-full lg:hidden" aria-expanded={open} aria-controls="catalogue-filters" onClick={() => setOpen(!open)}>
        <SlidersHorizontal aria-hidden />
        {open ? "Hide filters" : "Filters"}
        {activeCount > 0 && <span className="rounded-sm bg-primary px-1.5 font-mono text-xs text-primary-foreground">{activeCount}</span>}
      </button>
      <div id="catalogue-filters" className={`space-y-6 ${open ? "mt-4" : "hidden"} lg:mt-0 lg:block`}>
        {children}
      </div>
    </aside>
  );
}
