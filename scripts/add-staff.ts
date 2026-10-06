import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

/**
 * Creates (or promotes) a staff login. Staff = Supabase user with app_metadata.role = "staff".
 * That flag can only be set with the service-role key, so people who merely sign up never get access.
 *
 *   bun run staff:add someone@vpro.id 'a-long-password'      # create, or reset password + promote
 *   bun run staff:add someone@vpro.id                          # promote an existing user, keep their password
 *   bun run staff:remove someone@vpro.id                       # demote (they can no longer use the app)
 */
const [email, password] = process.argv.slice(2);
const remove = process.argv[1]?.includes("remove") || process.env.npm_lifecycle_event === "staff:remove";
if (!email) {
  console.error("Usage: bun run staff:add <email> [password]   |   bun run staff:remove <email>");
  process.exit(1);
}
if (password && password.length < 10) {
  console.error("Use a password of at least 10 characters.");
  process.exit(1);
}

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
if (error) throw error;
const existing = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

if (remove) {
  if (!existing) throw new Error(`No user ${email}`);
  const r = await admin.auth.admin.updateUserById(existing.id, { app_metadata: { ...existing.app_metadata, role: null } });
  console.log(r.error ? `Failed: ${r.error.message}` : `${email} is no longer staff.`);
} else if (existing) {
  const r = await admin.auth.admin.updateUserById(existing.id, { app_metadata: { ...existing.app_metadata, role: "staff" }, ...(password ? { password } : {}) });
  console.log(r.error ? `Failed: ${r.error.message}` : `${email} is staff${password ? " (password updated)" : ""}.`);
} else {
  if (!password) throw new Error("New user: provide a password.");
  const r = await admin.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { role: "staff" } });
  console.log(r.error ? `Failed: ${r.error.message}` : `Created staff user ${email}.`);
}
