import "server-only";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Staff = a Supabase user whose `app_metadata.role` is "staff". app_metadata can only be written with the
 * service-role key (never by the user), so open sign-ups alone can't grant access. Create staff with
 * `bun run staff:add <email> <password>`.
 */
export const isStaff = (user: Pick<User, "app_metadata"> | null | undefined) => user?.app_metadata?.role === "staff";

/** Use in every server action / route handler that touches staff data. */
export async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  if (!isStaff(data.user)) {
    await supabase.auth.signOut();
    redirect("/login?error=not-staff");
  }
  return data.user;
}
