import { cn } from "@/lib/utils";

/** Text-only brand mark: "V-PRO". Size it with a text-size class, e.g. <Logo className="text-2xl" />. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("select-none font-extrabold leading-none tracking-tight text-foreground", className)} aria-label="V-PRO">
      V-<span className="text-brand-ink">PRO</span>
    </span>
  );
}
