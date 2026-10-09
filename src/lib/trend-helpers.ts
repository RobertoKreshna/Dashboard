// Client-safe helpers for the deals trend chart (no server-only imports).

const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** 0 = Sunday. Parsed in UTC so the browser's timezone can't shift the day. */
export const weekday = (d: string) => new Date(`${d}T00:00:00Z`).getUTCDay();
export const isWeekend = (d: string) => weekday(d) % 6 === 0;
export const dayShort = (d: string) => DAYS_SHORT[weekday(d)];

/** "2026-10-05" -> "Monday, 5 Oct 2026" */
export function longDate(d: string) {
  return `${DAYS_LONG[weekday(d)]}, ${Number(d.slice(8))} ${MONTHS_SHORT[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;
}

/** "2026-10-05" -> "5 Sep" style short label for the previous-month date in tooltips. */
export function shortDate(d: string) {
  return `${DAYS_SHORT[weekday(d)]}, ${Number(d.slice(8))} ${MONTHS_SHORT[Number(d.slice(5, 7)) - 1]}`;
}

/** Same day one month earlier, clamped to that month's last day (31 Mar -> 28/29 Feb). */
export function shiftMonthBack(d: string) {
  let y = Number(d.slice(0, 4));
  let m = Number(d.slice(5, 7)) - 1;
  if (m < 1) { m = 12; y--; }
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const day = Math.min(Number(d.slice(8)), last);
  return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Difference between this period and the previous one; pct is null when there is nothing to divide by. */
export function compareValues(current: number, previous: number) {
  const diff = current - previous;
  return {
    diff,
    pct: previous > 0 ? Math.round((diff / previous) * 100) : null,
    dir: diff > 0 ? ("up" as const) : diff < 0 ? ("down" as const) : ("flat" as const),
  };
}

// Fixed colours for the known categories; anything else is hashed into the palette so a colour never
// depends on rank or on which other lines are in the period.
const FIXED: Record<string, string> = {
  Total: "#2b78a8",
  Cash: "#2a9d6f",
  "Not recorded": "#6b7280",
  "Bank (unspecified)": "#9ca3af",
};
const PALETTE = [
  "#2b78a8", "#e07a1f", "#8e5bd6", "#0ea5b7", "#b8860b", "#e0559c", "#5b8c1f", "#a35c2b", "#4f46e5", "#c026d3",
  "#1f2937", "#e11d48", "#16a34a", "#0891b2", "#7c3aed", "#ca8a04", "#db2777",
];
export function seriesColor(name: string) {
  if (FIXED[name]) return FIXED[name];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
