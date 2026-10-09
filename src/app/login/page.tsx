import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { safeNext } from "@/lib/safe-next";
import { LoginForm } from "./login-form";

export const metadata = { title: "Staff login · V-PRO", robots: { index: false, follow: false } };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <Logo className="text-5xl" />
          <p className="text-sm text-muted-foreground">Property management · staff only</p>
        </div>
        <div className="rounded-2xl border bg-card p-6 shadow-md">
          <h1 className="mb-4 text-lg font-semibold">Sign in</h1>
          {error === "not-staff" && (
            <p role="alert" className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
              That account doesn&apos;t have staff access.
            </p>
          )}
          <LoginForm next={safeNext(next)} />
        </div>
        <p className="text-center text-sm">
          <Link href="/listings-public" className="text-brand-ink underline-offset-4 hover:underline">
            Browse public listings
          </Link>
        </p>
      </div>
    </main>
  );
}
