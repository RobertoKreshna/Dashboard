import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/listings-public"
            className="flex items-center gap-3"
            aria-label="V-PRO property listings"
          >
            <Logo className="text-2xl" />
            <span className="hidden border-l pl-3 text-sm text-muted-foreground sm:inline">
              Property Listings
            </span>
          </Link>
          <Link
            href="/login"
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-brand-ink hover:bg-brand-light/50"
          >
            Staff login
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
      <footer className="border-t bg-white py-6 text-center text-xs text-muted-foreground">
        © 2026 V-PRO Property · Administrative boundaries:{" "}
        <a
          className="underline"
          href="https://github.com/cahyadsn/wilayah_boundaries"
        >
          cahyadsn/wilayah_boundaries
        </a>{" "}
        (MIT), detailed boundaries © Badan Informasi Geospasial (BIG)
      </footer>
    </div>
  );
}
