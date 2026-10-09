"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Bookmark, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Saved = { name: string; query: string };
const KEY = "vpro:saved-searches";
const MAX = 10;

const CHANGED = "vpro:saved-searches-changed";

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(CHANGED, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(CHANGED, cb);
  };
}
const snapshot = () => {
  try {
    return localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
};

function parse(raw: string): Saved[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((s) => typeof s?.name === "string" && typeof s?.query === "string").slice(0, MAX) : [];
  } catch {
    return [];
  }
}

/** Remembers filter combinations on this device (localStorage); no account or server storage involved. */
export function SavedSearches({ basePath }: { basePath: string }) {
  const sp = useSearchParams();
  const raw = React.useSyncExternalStore(subscribe, snapshot, () => "[]");
  const items = React.useMemo(() => parse(raw), [raw]);
  const [naming, setNaming] = React.useState(false);
  const [name, setName] = React.useState("");

  // The current filters without paging, so a saved search always opens on page 1.
  const query = React.useMemo(() => {
    const p = new URLSearchParams(sp.toString());
    p.delete("page");
    return p.toString();
  }, [sp]);
  const hasFilters = query !== "" && query !== "status=available";
  const already = items.some((s) => s.query === query);

  const persist = (next: Saved[]) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(CHANGED));
    } catch {}
  };
  const save = () => {
    const label = name.trim().slice(0, 40) || "My search";
    persist([{ name: label, query }, ...items.filter((s) => s.query !== query)].slice(0, MAX));
    setNaming(false);
    setName("");
  };

  if (!items.length && !hasFilters) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {hasFilters && !already && !naming && (
        <Button type="button" variant="outline" size="sm" onClick={() => setNaming(true)} className="gap-1.5">
          <Bookmark className="size-3.5" /> Save this search
        </Button>
      )}
      {naming && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          className="flex items-center gap-2"
        >
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            placeholder="Name, e.g. 3BR Bandung"
            aria-label="Saved search name"
            className="h-8 rounded-md border bg-background px-2.5 text-sm"
          />
          <Button type="submit" size="sm">Save</Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setNaming(false)}>Cancel</Button>
        </form>
      )}
      {items.map((s) => (
        <span key={s.query} className="inline-flex items-center overflow-hidden rounded-full border bg-card">
          <Link href={s.query ? `${basePath}?${s.query}` : basePath} className="px-3 py-1 hover:bg-brand-light/50">
            {s.name}
          </Link>
          <button
            type="button"
            aria-label={`Remove saved search ${s.name}`}
            onClick={() => persist(items.filter((x) => x.query !== s.query))}
            className="px-1.5 py-1 text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </span>
      ))}
    </div>
  );
}
