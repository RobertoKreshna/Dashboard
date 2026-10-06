"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isStaff } from "@/lib/auth";
import { safeNext } from "@/lib/safe-next";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error?: string };

export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };
  if (email.length > 254 || password.length > 200) return { error: "Invalid email or password." };

  // Slow down password guessing: per IP+email and per IP.
  const ip = clientIp(await headers());
  const perAccount = rateLimit(`login:${ip}:${email}`, 5, 15 * 60_000);
  const perIp = rateLimit(`login-ip:${ip}`, 30, 15 * 60_000);
  if (!perAccount.ok || !perIp.ok) {
    const wait = Math.ceil(Math.max(perAccount.retryAfter, perIp.retryAfter) / 60);
    return { error: `Too many sign-in attempts. Try again in about ${wait} minute${wait === 1 ? "" : "s"}.` };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Invalid email or password." };

  // A valid account without the staff role (e.g. someone who signed up) gets no access.
  if (!isStaff(data.user)) {
    await supabase.auth.signOut();
    return { error: "This account doesn't have staff access." };
  }

  redirect(safeNext(String(formData.get("next") ?? "/")));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
