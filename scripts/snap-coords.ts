import { config } from "dotenv";
import postgres from "postgres";
import { findPlace, inside, randomPointIn } from "./geo-sample";

config({ path: ".env.local", quiet: true });

/**
 * Moves SAMPLE listings whose coordinates fall outside their own village/district onto a random point inside it.
 * Only touches an explicit id range so real listings are never moved:
 *   bun scripts/snap-coords.ts 1 152      # LST-0001 .. LST-0152
 */
const from = Number(process.argv[2]);
const to = Number(process.argv[3]);
if (!from || !to) {
  console.error("Usage: bun scripts/snap-coords.ts <fromNumber> <toNumber>");
  process.exit(1);
}
const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
const rows = await sql<{ id: string; province: string; city: string; district: string; village: string; latitude: number | null; longitude: number | null }[]>`
  select id, province, city, district, village, latitude::float8 as latitude, longitude::float8 as longitude
  from listings
  where id ~ '^LST-[0-9]+$' and substring(id from 5)::int between ${from} and ${to}`;
let moved = 0, skipped = 0;
for (const r of rows) {
  const place = findPlace(r.province, r.city, r.district, r.village);
  if (!place) { skipped++; continue; }
  if (r.latitude !== null && r.longitude !== null && inside([r.longitude, r.latitude], place)) continue;
  const pt = randomPointIn(place, Math.random);
  if (!pt) { skipped++; continue; }
  await sql`update listings set longitude = ${pt[0].toFixed(6)}, latitude = ${pt[1].toFixed(6)} where id = ${r.id}`;
  moved++;
}
console.log(`${rows.length} checked, ${moved} moved inside their village/district, ${skipped} skipped (no boundary).`);
await sql.end();
