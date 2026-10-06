"use client";

import * as React from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]; // weeks start on Monday

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`; // m is 1-12
const parse = (s: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? { y: +m[1], m: +m[2], d: +m[3] } : null;
};
const fmt = (s: string) => {
  const p = parse(s);
  return p ? `${pad(p.d)}/${pad(p.m)}/${p.y}` : "";
};
const todayIso = () => {
  const n = new Date();
  return iso(n.getFullYear(), n.getMonth() + 1, n.getDate());
};

/** Cells of one month grid: null = padding before the 1st. */
function monthCells(y: number, m: number): (string | null)[] {
  const lead = (new Date(y, m - 1, 1).getDay() + 6) % 7;
  const days = new Date(y, m, 0).getDate();
  return [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => iso(y, m, i + 1))];
}

/**
 * Inline range calendar: click a start day, then an end day (hover previews the range).
 * Values are ISO dates ("YYYY-MM-DD"); `to` is "" while the end is still being picked.
 */
export function RangeCalendar({
  from,
  to,
  onChange,
  months = 2,
  showSummary = true,
  single = false,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  months?: 1 | 2;
  showSummary?: boolean;
  /** Pick one day instead of a range. */
  single?: boolean;
}) {
  const anchor = parse(from) ?? parse(todayIso())!;
  const [view, setView] = React.useState({ y: anchor.y, m: anchor.m }); // first visible month
  const [hover, setHover] = React.useState("");
  const picking = !!from && !to; // start chosen, waiting for the end
  const today = todayIso();

  // Jump to the range when it is changed from outside (presets).
  const key = `${from}|${to}`;
  const [lastKey, setLastKey] = React.useState(key);
  if (key !== lastKey) {
    setLastKey(key);
    const p = parse(from);
    if (p && (p.y !== view.y || p.m !== view.m)) setView({ y: p.y, m: p.m });
  }

  const shift = (d: number) => {
    const i = view.y * 12 + (view.m - 1) + d;
    setView({ y: Math.floor(i / 12), m: (i % 12) + 1 });
  };

  const pick = (day: string) => {
    if (single) return onChange(day, day);
    if (!from || to) return onChange(day, ""); // start a new range
    if (day < from) return onChange(day, from); // clicked before the start: swap
    onChange(from, day);
  };

  // Effective end while previewing
  const previewEnd = picking && hover && hover >= from ? hover : to;

  const shown = Array.from({ length: months }, (_, i) => {
    const idx = view.y * 12 + (view.m - 1) + i;
    return { y: Math.floor(idx / 12), m: (idx % 12) + 1 };
  });

  return (
    <div className="space-y-3">
      <div className={cn("items-center justify-between gap-2 text-sm", showSummary ? "flex" : "hidden")}>
        <p className="font-medium" aria-live="polite">
          {from ? fmt(from) : "Start date"} <span className="text-muted-foreground">→</span>{" "}
          {to ? fmt(to) : picking ? "pick end date" : "End date"}
        </p>
        {(from || to) && (
          <button type="button" onClick={() => onChange("", "")} className="text-xs font-medium text-brand-ink hover:underline">
            Clear dates
          </button>
        )}
      </div>

      <div className="relative">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => shift(-1)}
          className="absolute left-0 top-0 z-10 rounded-lg p-1.5 hover:bg-muted"
        >
          <ChevronLeft className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => shift(1)}
          className="absolute right-0 top-0 z-10 rounded-lg p-1.5 hover:bg-muted"
        >
          <ChevronRight className="size-4" />
        </button>

        <div className={cn("grid gap-6", months === 2 && "sm:grid-cols-2")}>
          {shown.map(({ y, m }, i) => (
            <div key={`${y}-${m}`} className={cn(i > 0 && months === 2 && "hidden sm:block")} onMouseLeave={() => setHover("")}>
              <div className="mb-2 text-center text-sm font-semibold">
                {MONTHS[m - 1]} {y}
              </div>
              <div className="grid grid-cols-7 text-center text-[11px] font-medium text-muted-foreground">
                {DOW.map((d) => (
                  <div key={d} className="py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {monthCells(y, m).map((day, k) => {
                  if (!day) return <div key={`b${k}`} />;
                  const start = day === from;
                  const end = day === (previewEnd || from);
                  const inRange = !!from && !!previewEnd && day > from && day < previewEnd;
                  const edge = start || (!!previewEnd && day === previewEnd);
                  const dnum = +day.slice(8);
                  return (
                    <div
                      key={day}
                      className={cn(
                        "relative py-0.5",
                        inRange && "bg-brand-light/60",
                        start && previewEnd && previewEnd !== from && "rounded-l-full bg-brand-light/60",
                        end && from && previewEnd && previewEnd !== from && "rounded-r-full bg-brand-light/60",
                      )}
                    >
                      <button
                        type="button"
                        aria-label={fmt(day)}
                        aria-pressed={edge}
                        onClick={() => pick(day)}
                        onMouseEnter={() => picking && setHover(day)}
                        className={cn(
                          "mx-auto flex size-9 items-center justify-center rounded-full text-sm tabular-nums transition",
                          edge ? "bg-primary font-semibold text-primary-foreground" : "hover:bg-brand-light",
                          !edge && day === today && "ring-1 ring-ring",
                        )}
                      >
                        {dnum}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Input-like field that opens the range calendar in a popup. The popup is fixed-positioned so it is never
 * clipped by a scrolling modal, flips upward near the bottom of the screen, and closes once both dates are picked.
 */
export function DateRangeField({
  from,
  to,
  onChange,
  placeholder = "Any date",
  "aria-label": ariaLabel = "Date range",
  single = false,
  id,
  name,
  invalid,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  placeholder?: string;
  "aria-label"?: string;
  single?: boolean;
  id?: string;
  /** Posts the (start) date as ISO under this name, like a native date input. */
  name?: string;
  invalid?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState<{ left: number; top: number; width: number; two: boolean } | null>(null);
  const root = React.useRef<HTMLDivElement>(null);
  const trigger = React.useRef<HTMLButtonElement>(null);
  const pop = React.useRef<HTMLDivElement>(null);

  /** Places the popup below the field, else above it, else pinned inside the viewport (never clipped). */
  const place = React.useCallback(
    (popHeight: number) => {
      const r = trigger.current?.getBoundingClientRect();
      if (!r) return;
      const two = !single && window.innerWidth >= 640;
      const width = Math.min(two ? 600 : 340, window.innerWidth - 16);
      const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
      const gap = 6;
      const below = window.innerHeight - r.bottom - gap - 8;
      const above = r.top - gap - 8;
      let top: number;
      if (below >= popHeight) top = r.bottom + gap;
      else if (above >= popHeight) top = r.top - gap - popHeight;
      else top = Math.max(8, Math.min(window.innerHeight - popHeight - 8, r.bottom + gap)); // pinned to fit
      setPos({ left, top, width, two });
    },
    [single],
  );

  const openPop = () => {
    place(single ? 380 : 400); // estimate; corrected with the real height right after it renders
    setOpen(true);
  };

  // Re-place using the popup's measured height (the estimate above may be off).
  React.useLayoutEffect(() => {
    if (open && pop.current) place(pop.current.offsetHeight);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pos?.two]);

  React.useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!pop.current?.contains(t) && !root.current?.contains(t)) setOpen(false);
    };
    // Capture + stopPropagation: Esc closes only the calendar, not the filter modal behind it.
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setOpen(false);
      trigger.current?.focus();
    };
    const close = () => setOpen(false);
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", down);
      document.removeEventListener("keydown", key, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  const label = from ? (single ? fmt(from) : `${fmt(from)} – ${to ? fmt(to) : "…"}`) : "";

  return (
    <div ref={root}>
      {name && <input type="hidden" name={name} value={from} />}
      <button
        ref={trigger}
        id={id}
        type="button"
        data-invalid={invalid || undefined}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => (open ? setOpen(false) : openPop())}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-input bg-white px-3 text-left text-sm outline-none transition",
          "hover:border-ring/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40",
          open && "border-ring ring-3 ring-ring/30",
          "data-[invalid]:border-destructive",
        )}
      >
        <span className={cn("truncate", !label && "text-muted-foreground")}>{label || placeholder}</span>
        <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
      </button>

      {open && pos && (
        <div
          ref={pop}
          role="dialog"
          aria-label="Choose dates"
          style={{ left: pos.left, top: pos.top, width: pos.width, maxHeight: "calc(100dvh - 16px)", overflowY: "auto" }}
          className="fixed z-[80] rounded-xl border bg-popover p-4 shadow-xl"
        >
          <RangeCalendar
            from={from}
            to={to}
            months={pos.two ? 2 : 1}
            single={single}
            showSummary={!single}
            onChange={(f, t) => {
              onChange(f, t);
              if (f && t) setOpen(false); // date(s) chosen: done
            }}
          />
        </div>
      )}
    </div>
  );
}

/** Single-date field with the same popup calendar. Value is an ISO date ("YYYY-MM-DD"). */
export function DateField({
  value,
  onChange,
  placeholder = "Select date",
  ...rest
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  name?: string;
  invalid?: boolean;
  "aria-label"?: string;
}) {
  return <DateRangeField single from={value} to={value} onChange={(f) => onChange(f)} placeholder={placeholder} {...rest} />;
}
