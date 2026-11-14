"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Search } from "lucide-react";
import { api } from "@/lib/api";
import { track } from "@/lib/track";
import { cn } from "@/lib/utils";

/** Search field with title suggestions. Works as a plain GET form if JavaScript is unavailable. */
export function SearchBox({
  defaultValue = "",
  size = "md",
  className,
  placeholder = "Search by name, topic or technology",
  autoFocus = false,
}: {
  defaultValue?: string;
  size?: "md" | "lg";
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const listId = useId();
  const [q, setQ] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    clearTimeout(timer.current);
    if (q.trim().length < 2 || q === defaultValue) return;
    timer.current = setTimeout(() => {
      api<string[]>(`/public/projects/suggest?q=${encodeURIComponent(q.trim())}`).then(setSuggestions).catch(() => setSuggestions([]));
    }, 220);
    return () => clearTimeout(timer.current);
  }, [q, defaultValue]);

  const go = (term: string) => {
    const t = term.trim();
    setOpen(false);
    if (!t) return router.push("/projects");
    track("SEARCH", { query: t });
    router.push(`/search?q=${encodeURIComponent(t)}`);
  };
  const shown = open && q.trim().length >= 2 ? suggestions : [];

  return (
    <form
      role="search"
      action="/search"
      className={cn("relative", className)}
      onSubmit={(e) => {
        e.preventDefault();
        go(active >= 0 ? shown[active] : q);
      }}
    >
      <label htmlFor={listId + "-input"} className="sr-only">Search projects</label>
      <Search className={cn("pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground", size === "lg" ? "left-4 size-5" : "left-3 size-4")} aria-hidden />
      <input
        id={listId + "-input"}
        name="q"
        type="search"
        autoComplete="off"
        autoFocus={autoFocus}
        value={q}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={shown.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(-1); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, shown.length - 1)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, -1)); }
          if (e.key === "Escape") setOpen(false);
        }}
        className={cn("field [&::-webkit-search-cancel-button]:hidden", size === "lg" ? "h-14 rounded-lg pr-28 pl-12 text-base shadow-[0_1px_0_var(--border)]" : "pr-20 pl-9")}
      />
      <button type="submit" className={cn("btn-primary absolute top-1/2 -translate-y-1/2", size === "lg" ? "right-2 h-10" : "btn-sm right-1")}>Search</button>
      {shown.length > 0 && (
        <ul id={listId} role="listbox" className="absolute top-full right-0 left-0 z-30 mt-1 overflow-hidden rounded-md border bg-popover py-1 shadow-lg">
          {shown.map((s, i) => (
            <li
              key={s}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => { e.preventDefault(); go(s); }}
              className="cursor-pointer truncate px-4 py-2 text-sm aria-selected:bg-secondary hover:bg-secondary"
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
