import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import { seedBulk } from "./seed-bulk";

config({ path: ".env.local" });
config();

// Adds listings + deals WITHOUT touching existing data.
// Usage: bun run db:seed:more [count] [seed] [--city="Kota Makassar"]
async function main() {
  const args = process.argv.slice(2);
  const cities = args.filter((a) => a.startsWith("--city=")).map((a) => a.slice(7));
  const nums = args.filter((a) => !a.startsWith("--"));
  const count = Number(nums[0]) || 100;
  const seed = Number(nums[1]) || Date.now() % 100000;
  const client = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });
  const db = drizzle(client);
  const codes = await db.execute<{ code: string }>(sql`select code from sales_codes where is_active order by code`);
  if (codes.length === 0) throw new Error("No active sales codes. Run `db:seed` first (or create some in the app).");
  const res = await seedBulk(db as never, count, codes.map((c) => c.code), seed, cities);
  console.log(`Added ${res.listings} listings (${res.closed} closed, ${res.reserved} reserved) and ${res.deals} deals.`);
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
