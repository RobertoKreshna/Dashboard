import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import { deals, facilities, listings, salesCodes } from "../src/db/schema";
import { DEFAULT_FACILITIES } from "../src/lib/constants";
import { seedBulk } from "./seed-bulk";

config({ path: ".env.local" });
config();

const reset = process.argv.includes("--reset");

function isoDaysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function main() {
  const client = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });
  const db = drizzle(client);

  const [{ n }] = await db.execute<{ n: number }>(sql`select count(*)::int as n from sales_codes`);
  if (n > 0 && !reset) {
    console.log("Database already has data. Re-run with --reset to wipe and reseed.");
    await client.end();
    return;
  }
  if (reset) {
    await db.execute(sql`truncate deals, listing_photos, listings, facilities, sales_codes restart identity cascade`);
    await db.execute(sql`alter sequence listing_seq restart with 1`);
    await db.execute(sql`alter sequence deal_seq restart with 1`);
  }

  await db.insert(salesCodes).values([
    { code: "S001", fullName: "Andi Pratama", phone: "0812-1111-0001", email: "andi@vpro.example" },
    { code: "S002", fullName: "Siti Rahmawati", phone: "0813-2222-0002", email: "siti@vpro.example" },
    { code: "S003", fullName: "Budi Santoso", phone: "0857-3333-0003", email: "budi@vpro.example" },
    { code: "S004", fullName: "Dewi Lestari (resigned)", phone: "0821-4444-0004", email: "dewi@vpro.example", isActive: false },
  ]);

  await db.insert(facilities).values([...DEFAULT_FACILITIES, "Balcony", "Rooftop"].map((name) => ({ name })));

  const L = (
    title: string,
    listingType: "sell" | "rent",
    price: number,
    propertyType: "house" | "apartment" | "land" | "ruko" | "office" | "warehouse" | "villa",
    loc: [string, string, string, string, string, string],
    land: number | null,
    building: number | null,
    bed: number,
    bath: number,
    fac: string[],
    salesCode: string,
    extra: Partial<typeof listings.$inferInsert> = {},
  ): typeof listings.$inferInsert => ({
    title,
    listingType,
    price,
    propertyType,
    address: loc[0],
    village: loc[1],
    district: loc[2],
    city: loc[3],
    province: loc[4],
    postalCode: loc[5],
    landArea: land,
    buildingArea: building,
    bedrooms: bed,
    bathrooms: bath,
    facilities: fac,
    salesCode,
    rentalPeriod: listingType === "rent" ? "month" : null,
    ...extra,
  });

  const rows = await db
    .insert(listings)
    .values([
      L("Modern 2-storey house in Kebayoran", "sell", 4_500_000_000, "house", ["Jl. Melawai Raya No. 12", "Melawai", "Kebayoran Baru", "Jakarta Selatan", "DKI Jakarta", "12160"], 220, 180, 4, 3, ["Carport", "Garden", "AC", "Security 24h"], "S001", { electricityWatts: 4400, notes: "Owner flexible on price, prefers cash." }),
      L("Cozy 2BR apartment near SCBD", "rent", 12_000_000, "apartment", ["Apt. Senopati Suites Tower B #1205", "Senayan", "Kebayoran Baru", "Jakarta Selatan", "DKI Jakarta", "12190"], null, 68, 2, 2, ["Furnished", "AC", "Swimming pool", "Gym"], "S002", { electricityWatts: 3500 }),
      L("Corner shop-house on main road", "sell", 3_200_000_000, "ruko", ["Jl. Pondok Indah No. 88", "Pondok Pinang", "Kebayoran Lama", "Jakarta Selatan", "DKI Jakarta", "12310"], 90, 210, 0, 3, ["Security 24h", "AC"], "S001"),
      L("Family house with pool in Cipete", "sell", 7_800_000_000, "house", ["Jl. Cipete Raya No. 5", "Cipete Selatan", "Cilandak", "Jakarta Selatan", "DKI Jakarta", "12410"], 400, 320, 5, 4, ["Swimming pool", "Garage", "Garden", "Water heater", "AC"], "S003", { electricityWatts: 6600 }),
      L("Strategic land plot in Bandung", "sell", 1_950_000_000, "land", ["Jl. Dago Atas Kav. 7", "Dago", "Coblong", "Kota Bandung", "Jawa Barat", "40135"], 650, null, 0, 0, [], "S002"),
      L("Minimalist house in Antapani", "sell", 1_350_000_000, "house", ["Jl. Terusan Jakarta No. 21", "Antapani Kidul", "Antapani", "Kota Bandung", "Jawa Barat", "40291"], 105, 90, 3, 2, ["Carport", "Water heater"], "S002", { electricityWatts: 2200 }),
      L("Office space, 3rd floor", "rent", 180_000_000, "office", ["Jl. Asia Afrika No. 100 Lt. 3", "Braga", "Sumur Bandung", "Kota Bandung", "Jawa Barat", "40111"], null, 250, 0, 2, ["AC", "Security 24h", "CCTV"], "S003", { rentalPeriod: "year" }),
      L("Warehouse with loading dock", "rent", 450_000_000, "warehouse", ["Jl. Industri Raya Blok C3", "Margahayu", "Bekasi Timur", "Kota Bekasi", "Jawa Barat", "17113"], 1200, 900, 0, 2, ["Security 24h", "CCTV"], "S001", { rentalPeriod: "year", electricityWatts: 33000 }),
      L("Tropical villa in Canggu", "sell", 9_500_000_000, "villa", ["Jl. Pantai Berawa No. 3", "Tibubeneng", "Kuta Utara", "Badung", "Bali", "80361"], 500, 280, 4, 4, ["Swimming pool", "Garden", "Furnished", "AC"], "S003", { electricityWatts: 7700 }),
      L("Studio apartment, monthly rent", "rent", 6_500_000, "apartment", ["Apt. Taman Anggrek #1802", "Tanjung Duren Selatan", "Grogol Petamburan", "Jakarta Barat", "DKI Jakarta", "11470"], null, 32, 1, 1, ["Furnished", "AC"], "S002"),
      L("Townhouse in BSD City", "sell", 2_900_000_000, "house", ["Cluster Avani No. 18", "Lengkong Gudang", "Serpong", "Tangerang Selatan", "Banten", "15321"], 120, 140, 3, 3, ["Carport", "Garden", "AC", "Security 24h"], "S001", { status: "reserved" }),
      L("Family house, Sleman", "rent", 45_000_000, "house", ["Jl. Kaliurang Km 7 No. 9", "Sinduharjo", "Ngaglik", "Sleman", "DI Yogyakarta", "55581"], 200, 150, 3, 2, ["Garden", "Carport"], "S003", { rentalPeriod: "year" }),
    ])
    .returning({ id: listings.id, title: listings.title });

  // Approximate coordinates (same order as the listings above) so the public map can show dots.
  const COORDS: [number, number][] = [
    [-6.2441, 106.799], [-6.226, 106.801], [-6.278, 106.783], [-6.268, 106.8],
    [-6.865, 107.614], [-6.915, 107.65], [-6.921, 107.607], [-6.24, 107.02],
    [-8.65, 115.137], [-6.177, 106.79], [-6.3, 106.67], [-7.73, 110.4],
  ];
  for (const [i, [latitude, longitude]] of COORDS.entries()) {
    await db.update(listings).set({ latitude, longitude }).where(sql`id = ${rows[i].id}`);
  }

  const id = (i: number) => rows[i].id;
  // Linked deals flip the listing status exactly like the app does.
  await db.insert(deals).values([
    { listingId: id(2), source: "listing", dealType: "sale", propertyType: "ruko", address: "Jl. Pondok Indah No. 88", village: "Pondok Pinang", district: "Kebayoran Lama", city: "Jakarta Selatan", province: "DKI Jakarta", listingPrice: 3_200_000_000, finalPrice: 3_050_000_000, dealDate: isoDaysAgo(3), buyerName: "PT Maju Bersama", buyerPhone: "021-555-0101", salesCode: "S001", paymentType: "bank", bankName: "BCA", commissionPercent: 2, commissionAmount: 61_000_000 },
    { listingId: id(5), source: "listing", dealType: "sale", propertyType: "house", address: "Jl. Terusan Jakarta No. 21", village: "Antapani Kidul", district: "Antapani", city: "Bandung", province: "Jawa Barat", listingPrice: 1_350_000_000, finalPrice: 1_300_000_000, dealDate: isoDaysAgo(12), buyerName: "Rina Wijaya", buyerPhone: "0812-9000-1234", salesCode: "S002", paymentType: "bank", bankName: "Mandiri", commissionPercent: 2.5, commissionAmount: 32_500_000 },
    { listingId: id(11), source: "listing", dealType: "rent", propertyType: "house", address: "Jl. Kaliurang Km 7 No. 9", village: "Sinduharjo", district: "Ngaglik", city: "Sleman", province: "DI Yogyakarta", listingPrice: 45_000_000, finalPrice: 42_000_000, dealDate: isoDaysAgo(20), contractStart: isoDaysAgo(15), contractEnd: isoDaysAgo(-350), buyerName: "Hendra Gunawan", buyerPhone: "0856-7000-8899", salesCode: "S003", paymentType: "cash", commissionAmount: 4_200_000 },
    { listingId: null, source: "manual", dealType: "sale", propertyType: "land", address: "Jl. Raya Puncak Km 82", village: "Cipanas", district: "Cipanas", city: "Cianjur", province: "Jawa Barat", finalPrice: 850_000_000, dealDate: isoDaysAgo(8), buyerName: "Bambang Hartono", buyerPhone: "0811-2200-3300", salesCode: "S001", paymentType: "bank", bankName: "BNI", commissionPercent: 3, commissionAmount: 25_500_000, notes: "Off-market deal introduced by a referral." },
    { listingId: null, source: "manual", dealType: "rent", propertyType: "ruko", address: "Jl. Gajah Mada No. 45", village: "Petojo", district: "Gambir", city: "Jakarta Pusat", province: "DKI Jakarta", finalPrice: 96_000_000, dealDate: isoDaysAgo(40), contractStart: isoDaysAgo(35), contractEnd: isoDaysAgo(-330), buyerName: "CV Sumber Rejeki", salesCode: "S002", paymentType: "cash", commissionAmount: 9_600_000 },
  ]);
  await db.update(listings).set({ status: "sold" }).where(sql`id in (${id(2)}, ${id(5)})`);
  await db.update(listings).set({ status: "rented" }).where(sql`id = ${id(11)}`);

  console.log(`Seeded 4 sales codes, ${rows.length} listings, 5 deals.`);
  const bulk = await seedBulk(db as never, 100, ["S001", "S002", "S003"]);
  console.log(`Plus ${bulk.listings} generated listings and ${bulk.deals} deals.`);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    const admin = createClient(url, key, { auth: { persistSession: false } });
    const email = process.env.SEED_STAFF_EMAIL ?? "staff@vpro.example";
    const password = process.env.SEED_STAFF_PASSWORD ?? "ChangeMe123!";
    const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { role: "staff" } });
    console.log(error ? `Staff user: ${error.message}` : `Staff login created: ${email} / ${password}`);
  } else {
    console.log("No SUPABASE_SERVICE_ROLE_KEY set — create a staff user in the Supabase dashboard (Auth → Users).");
  }
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
