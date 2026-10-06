"use client";

import * as React from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsPhone } from "@/lib/use-media";

/**
 * Styled dropdown that is a drop-in replacement for <select>: pass <option> children,
 * `value`/`defaultValue`, `onChange` (reads `e.target.value`) and `name` (posted via a hidden input).
 * Gets a search box automatically when there are many options.
 */

type Opt = { value: string; label: string; disabled: boolean };

function textOf(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (React.isValidElement(node)) return textOf((node.props as { children?: React.ReactNode }).children);
  return "";
}

function collect(children: React.ReactNode): Opt[] {
  const out: Opt[] = [];
  const walk = (nodes: React.ReactNode) => {
    React.Children.forEach(nodes, (c) => {
      if (!React.isValidElement(c)) return;
      const p = c.props as { value?: string | number; disabled?: boolean; children?: React.ReactNode };
      if (c.type === "option") {
        const label = textOf(p.children);
        out.push({ value: p.value !== undefined ? String(p.value) : label, label, disabled: !!p.disabled });
      } else walk(p.children); // fragments, optgroups
    });
  };
  walk(children);
  return out;
}

type ChangeLike = { target: { value: string; name?: string }; currentTarget: { value: string; name?: string } };

export function NativeSelect({
  children,
  value,
  defaultValue,
  onChange,
  name,
  id,
  disabled,
  className,
  searchable,
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
}: {
  children: React.ReactNode;
  value?: string | number;
  defaultValue?: string | number;
  onChange?: (e: ChangeLike) => void;
  name?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
  searchable?: boolean;
  "aria-label"?: string;
  "aria-invalid"?: boolean | "true" | "false";
}) {
  const options = collect(children);
  const [inner, setInner] = React.useState(defaultValue !== undefined ? String(defaultValue) : (options[0]?.value ?? ""));
  const current = value !== undefined ? String(value) : inner;
  const selected = options.find((o) => o.value === current);

  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [active, setActive] = React.useState(0);
  const [pos, setPos] = React.useState<{ left: number; width: number; top?: number; bottom?: number } | null>(null);
  const root = React.useRef<HTMLDivElement>(null);
  const trigger = React.useRef<HTMLButtonElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);
  const menu = React.useRef<HTMLDivElement>(null);
  const showSearch = searchable ?? options.length > 8;
  const listId = React.useId();
  const phone = useIsPhone();

  const visible = q.trim() ? options.filter((o) => o.label.toLowerCase().includes(q.trim().toLowerCase())) : options;

  const openMenu = () => {
    if (disabled) return;
    const r = trigger.current?.getBoundingClientRect();
    if (r) {
      // Fixed positioning so the menu is never clipped by scrolling/overflow-hidden parents (popovers, sheets).
      const flip = window.innerHeight - r.bottom < 300 && r.top > window.innerHeight - r.bottom;
      const w = Math.max(r.width, 192);
      const left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
      setPos({ left, width: r.width, ...(flip ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }) });
    }
    setQ("");
    setActive(Math.max(0, options.findIndex((o) => o.value === current)));
    setOpen(true);
  };
  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) trigger.current?.focus();
  };
  const choose = (o: Opt | undefined) => {
    if (!o || o.disabled) return;
    if (value === undefined) setInner(o.value);
    onChange?.({ target: { value: o.value, name }, currentTarget: { value: o.value, name } });
    close();
  };

  React.useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", down);
    if (phone) {
      // Bottom sheet: keep the page still behind it. Opening the keyboard resizes/scrolls the page, which must not close it.
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.removeEventListener("pointerdown", down);
        document.body.style.overflow = prev;
      };
    }
    // The menu is fixed, so close it if the page or a parent scrolls underneath it.
    const scroll = (e: Event) => !menu.current?.contains(e.target as Node) && setOpen(false);
    const shut = () => setOpen(false);
    window.addEventListener("scroll", scroll, true);
    window.addEventListener("resize", shut);
    return () => {
      document.removeEventListener("pointerdown", down);
      window.removeEventListener("scroll", scroll, true);
      window.removeEventListener("resize", shut);
    };
  }, [open, phone]);

  React.useEffect(() => {
    if (open) listRef.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const onKey = (e: React.KeyboardEvent) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    if (e.key === "Escape") return void (e.preventDefault(), close());
    if (e.key === "Tab") return setOpen(false);
    if (e.key === "ArrowDown") return void (e.preventDefault(), setActive((a) => Math.min(visible.length - 1, a + 1)));
    if (e.key === "ArrowUp") return void (e.preventDefault(), setActive((a) => Math.max(0, a - 1)));
    if (e.key === "Home") return void (e.preventDefault(), setActive(0));
    if (e.key === "End") return void (e.preventDefault(), setActive(visible.length - 1));
    if (e.key === "Enter") return void (e.preventDefault(), choose(visible[active]));
    // Type-ahead on plain lists
    if (!showSearch && e.key.length === 1) {
      const i = visible.findIndex((o) => o.label.toLowerCase().startsWith(e.key.toLowerCase()));
      if (i >= 0) setActive(i);
    }
  };

  const isPlaceholder = !selected || (selected.value === "" && selected.disabled);

  return (
    <div ref={root} className="relative" onKeyDown={onKey}>
      {name && !disabled && <input type="hidden" name={name} value={current} />}
      <button
        ref={trigger}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
        disabled={disabled}
        onClick={() => (open ? close(false) : openMenu())}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-input bg-white px-3 text-left text-sm outline-none transition",
          "hover:border-ring/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40",
          "disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70 aria-invalid:border-destructive",
          open && "border-ring ring-3 ring-ring/30",
          className,
        )}
      >
        <span className={cn("truncate", isPlaceholder && "text-muted-foreground")}>{selected?.label || "Select…"}</span>
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition", open && "rotate-180")} />
      </button>

      {open && (phone || pos) && (
        <>
          {phone && <div className="fixed inset-0 z-[69] bg-black/40" onClick={() => close(false)} aria-hidden />}
          <div
            ref={menu}
            style={phone ? undefined : { left: pos!.left, top: pos!.top, bottom: pos!.bottom, minWidth: Math.max(pos!.width, 192) }}
            className={cn(
              "fixed z-[70] overflow-hidden border bg-popover shadow-lg",
              phone ? "inset-x-0 bottom-0 flex max-h-[75dvh] flex-col rounded-t-2xl pb-[env(safe-area-inset-bottom)]" : "rounded-xl",
            )}
          >
            {phone && (
              <div className="flex items-center justify-between border-b px-4 py-3">
                <span className="truncate text-sm font-semibold">{ariaLabel || "Select"}</span>
                <button type="button" aria-label="Close" onClick={() => close(false)} className="-mr-1.5 rounded-lg p-1.5 hover:bg-muted">
                  <X className="size-5" />
                </button>
              </div>
            )}
            {showSearch && (
              <div className="relative border-b p-2">
                <Search className="pointer-events-none absolute left-4 top-4.5 size-4 text-muted-foreground" />
                <input
                  // No autofocus on phones: it pops the keyboard over the list before anyone has looked at it.
                  autoFocus={!phone}
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setActive(0);
                  }}
                  placeholder="Search…"
                  aria-label="Search options"
                  // 16px on phones: smaller text makes iOS Safari zoom the page on focus.
                  className="h-10 w-full rounded-md border border-input bg-white pl-8 pr-2 text-base outline-none focus-visible:border-ring sm:h-9 sm:text-sm"
                />
              </div>
            )}
            <ul
              ref={listRef}
              id={listId}
              role="listbox"
              aria-label={ariaLabel}
              className={cn("overflow-auto overscroll-contain p-1", phone ? "min-h-0 flex-1" : "max-h-64")}
            >
              {visible.length === 0 && <li className="px-3 py-3 text-center text-sm text-muted-foreground">No results</li>}
              {visible.map((o, i) => {
                const on = o.value === current;
                return (
                  <li
                    key={o.value + i}
                    data-i={i}
                    role="option"
                    aria-selected={on}
                    aria-disabled={o.disabled}
                    onMouseEnter={() => setActive(i)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => choose(o)}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-3 text-base sm:py-2 sm:text-sm",
                      i === active && "bg-brand-light/50",
                      on && "font-semibold",
                      o.disabled && "cursor-not-allowed opacity-50",
                    )}
                  >
                    <Check className={cn("size-4 shrink-0", on ? "opacity-100" : "opacity-0")} />
                    <span className="truncate">{o.label}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

export { NativeSelect as Select };
