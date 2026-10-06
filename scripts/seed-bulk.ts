import { sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { deals, listings } from "../src/db/schema";
import { DEFAULT_FACILITIES } from "../src/lib/constants";
import { findPlace, randomPointIn } from "./geo-sample";

type City = {
  city: string;
  province: string;
  lat: number;
  lng: number;
  weight: number;
  places: [district: string, village: string][];
};

// City names follow the official boundary names so every one of them shades on the public map.
const CITIES: City[] = [
  { city: "Jakarta Selatan", province: "DKI Jakarta", lat: -6.26, lng: 106.81, weight: 9, places: [["Kebayoran Baru", "Senayan"], ["Cilandak", "Cipete Selatan"], ["Pesanggrahan", "Bintaro"], ["Tebet", "Tebet Barat"]] },
  { city: "Jakarta Barat", province: "DKI Jakarta", lat: -6.17, lng: 106.76, weight: 5, places: [["Kebon Jeruk", "Sukabumi Utara"], ["Grogol Petamburan", "Tanjung Duren Selatan"], ["Kembangan", "Meruya Selatan"]] },
  { city: "Jakarta Pusat", province: "DKI Jakarta", lat: -6.18, lng: 106.83, weight: 3, places: [["Menteng", "Menteng"], ["Gambir", "Petojo Utara"]] },
  { city: "Jakarta Timur", province: "DKI Jakarta", lat: -6.23, lng: 106.9, weight: 4, places: [["Duren Sawit", "Pondok Kelapa"], ["Cakung", "Jatinegara"]] },
  { city: "Jakarta Utara", province: "DKI Jakarta", lat: -6.12, lng: 106.9, weight: 4, places: [["Kelapa Gading", "Kelapa Gading Barat"], ["Penjaringan", "Pluit"]] },
  { city: "Tangerang Selatan", province: "Banten", lat: -6.29, lng: 106.71, weight: 7, places: [["Serpong", "Lengkong Gudang"], ["Pamulang", "Pamulang Barat"], ["Pondok Aren", "Pondok Betung"]] },
  { city: "Kota Tangerang", province: "Banten", lat: -6.18, lng: 106.63, weight: 3, places: [["Tangerang", "Sukarasa"], ["Cipondoh", "Poris Plawad"]] },
  { city: "Kota Bekasi", province: "Jawa Barat", lat: -6.24, lng: 106.99, weight: 4, places: [["Bekasi Selatan", "Kayuringin Jaya"], ["Bekasi Barat", "Kota Baru"]] },
  { city: "Kota Depok", province: "Jawa Barat", lat: -6.4, lng: 106.82, weight: 3, places: [["Beji", "Kukusan"], ["Cinere", "Gandul"]] },
  { city: "Kota Bogor", province: "Jawa Barat", lat: -6.6, lng: 106.8, weight: 3, places: [["Bogor Tengah", "Babakan Pasar"], ["Bogor Barat", "Situgede"]] },
  { city: "Kota Bandung", province: "Jawa Barat", lat: -6.91, lng: 107.61, weight: 8, places: [["Coblong", "Dago"], ["Antapani", "Antapani Kidul"], ["Sumur Bandung", "Braga"], ["Cidadap", "Ledeng"]] },
  { city: "Bandung Barat", province: "Jawa Barat", lat: -6.84, lng: 107.5, weight: 2, places: [["Lembang", "Cikole"], ["Parongpong", "Cihideung"]] },
  { city: "Kota Semarang", province: "Jawa Tengah", lat: -7.0, lng: 110.42, weight: 3, places: [["Candisari", "Candi"], ["Banyumanik", "Pudakpayung"]] },
  { city: "Kota Surakarta", province: "Jawa Tengah", lat: -7.57, lng: 110.82, weight: 2, places: [["Banjarsari", "Manahan"]] },
  { city: "Kota Yogyakarta", province: "DI Yogyakarta", lat: -7.8, lng: 110.37, weight: 2, places: [["Gondokusuman", "Demangan"]] },
  { city: "Sleman", province: "DI Yogyakarta", lat: -7.72, lng: 110.35, weight: 3, places: [["Ngaglik", "Sinduharjo"], ["Depok", "Caturtunggal"]] },
  { city: "Bantul", province: "DI Yogyakarta", lat: -7.89, lng: 110.33, weight: 1, places: [["Kasihan", "Tamantirto"]] },
  { city: "Kota Surabaya", province: "Jawa Timur", lat: -7.26, lng: 112.75, weight: 5, places: [["Wiyung", "Babatan"], ["Gubeng", "Airlangga"], ["Sukolilo", "Keputih"]] },
  { city: "Sidoarjo", province: "Jawa Timur", lat: -7.45, lng: 112.72, weight: 2, places: [["Waru", "Kedungrejo"]] },
  { city: "Kota Malang", province: "Jawa Timur", lat: -7.98, lng: 112.63, weight: 2, places: [["Lowokwaru", "Dinoyo"]] },
  { city: "Badung", province: "Bali", lat: -8.65, lng: 115.17, weight: 6, places: [["Kuta Utara", "Canggu"], ["Kuta", "Seminyak"], ["Kuta Selatan", "Jimbaran"]] },
  { city: "Kota Denpasar", province: "Bali", lat: -8.67, lng: 115.21, weight: 2, places: [["Denpasar Selatan", "Sanur"]] },
  { city: "Gianyar", province: "Bali", lat: -8.54, lng: 115.33, weight: 2, places: [["Ubud", "Ubud"]] },
  { city: "Kota Medan", province: "Sumatera Utara", lat: 3.59, lng: 98.67, weight: 2, places: [["Medan Johor", "Titi Kuning"]] },
  { city: "Kota Palembang", province: "Sumatera Selatan", lat: -2.99, lng: 104.76, weight: 1, places: [["Ilir Timur I", "26 Ilir"]] },
  { city: "Kota Makassar", province: "Sulawesi Selatan", lat: -5.147, lng: 119.432, weight: 2, places: [["Panakkukang", "Pandang"], ["Rappocini", "Gunung Sari"], ["Tamalate", "Mannuruki"], ["Biringkanaya", "Daya"], ["Manggala", "Antang"], ["Ujung Pandang", "Losari"], ["Mariso", "Kampung Buyang"]] },
  { city: "Kota Balikpapan", province: "Kalimantan Timur", lat: -1.24, lng: 116.83, weight: 1, places: [["Balikpapan Selatan", "Damai"]] },
  { city: "Kota Batam", province: "Kepulauan Riau", lat: 1.13, lng: 104.05, weight: 1, places: [["Batam Kota", "Teluk Tering"]] },
  { city: "Kota Pekanbaru", province: "Riau", lat: 0.51, lng: 101.45, weight: 1, places: [["Sukajadi", "Kedung Sari"]] },
];

const TYPES = [
  { t: "house", w: 34 },
  { t: "apartment", w: 20 },
  { t: "land", w: 12 },
  { t: "ruko", w: 10 },
  { t: "office", w: 6 },
  { t: "warehouse", w: 5 },
  { t: "villa", w: 7 },
] as const;
type PT = (typeof TYPES)[number]["t"];

const LABEL: Record<PT, string> = { house: "house", apartment: "apartment", land: "land plot", ruko: "shop-house", office: "office space", warehouse: "warehouse", villa: "villa" };
const ADJ = ["Modern", "Spacious", "Cozy", "Elegant", "Strategic", "Minimalist", "Luxury", "Family", "Brand-new", "Well-kept", "Premium", "Charming"];
const STREETS = ["Jl. Merdeka", "Jl. Sudirman", "Jl. Melati", "Jl. Anggrek", "Jl. Kenanga", "Jl. Pahlawan", "Jl. Raya Utama", "Jl. Cendana", "Jl. Mawar", "Jl. Flamboyan", "Jl. Diponegoro", "Jl. Gatot Subroto"];
const BUYERS = ["Rina Wijaya", "Hendra Gunawan", "PT Maju Bersama", "Bambang Hartono", "CV Sumber Rejeki", "Dewi Anggraini", "Agus Setiawan", "Lestari Putri", "PT Karya Mandiri", "Yusuf Rahman", "Maya Kusuma", "Fajar Nugroho", "Indah Permata", "CV Cahaya Baru", "Rizky Pratama", "Siska Amelia", "Joko Widodo Santoso", "Tri Handayani"];

// Deterministic so reruns of a fresh seed look the same.
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const iso = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export async function seedBulk(
  db: PostgresJsDatabase<Record<string, never>>,
  count: number,
  salesCodes: string[],
  seed = 42,
  /** Only generate for these cities (exact names from CITIES); default = all, weighted. */
  onlyCities?: string[],
) {
  const pool = onlyCities?.length ? CITIES.filter((c) => onlyCities.includes(c.city)) : CITIES;
  if (pool.length === 0) throw new Error(`Unknown city. Available: ${CITIES.map((c) => c.city).join(", ")}`);
  const r = rng(seed);
  const pick = <T,>(a: readonly T[]) => a[Math.floor(r() * a.length)];
  const between = (lo: number, hi: number) => lo + r() * (hi - lo);
  const weighted = <T,>(items: readonly T[], w: (x: T) => number) => {
    let n = r() * items.reduce((s, x) => s + w(x), 0);
    for (const x of items) if ((n -= w(x)) <= 0) return x;
    return items[items.length - 1];
  };
  // Round to 2 significant digits so prices look human ("4.500.000.000", not "4.537.221.903").
  const nice = (x: number) => {
    const mag = 10 ** (Math.floor(Math.log10(x)) - 1);
    return Math.round(x / mag) * mag;
  };

  // Prefer a random point inside the real village/district polygon (needs `bun run geo:build`); else jitter around the city centre.
  const coords = (c: City, district: string, village: string) => {
    const place = findPlace(c.province, c.city, district, village);
    const pt = place ? randomPointIn(place, r) : null;
    return {
      latitude: Number((pt ? pt[1] : c.lat + between(-0.035, 0.035)).toFixed(6)),
      longitude: Number((pt ? pt[0] : c.lng + between(-0.035, 0.035)).toFixed(6)),
    };
  };

  const rows: (typeof listings.$inferInsert)[] = [];
  for (let i = 0; i < count; i++) {
    const c = weighted(pool, (x) => x.weight);
    const [district, village] = pick(c.places);
    const type = weighted(TYPES, (x) => x.w).t;
    // Apartments, offices and warehouses skew to rent; houses and land skew to sale.
    const rentBias = { house: 0.3, apartment: 0.5, land: 0.03, ruko: 0.4, office: 0.65, warehouse: 0.6, villa: 0.35 }[type];
    const rent = type !== "land" ? r() < rentBias : false;

    let price: number;
    let rentalPeriod: "month" | "year" | null = null;
    if (!rent) {
      const [lo, hi] = { house: [0.6e9, 15e9], apartment: [0.45e9, 6e9], land: [0.3e9, 10e9], ruko: [1e9, 8e9], office: [2e9, 20e9], warehouse: [3e9, 25e9], villa: [3e9, 30e9] }[type];
      price = nice(Math.exp(between(Math.log(lo), Math.log(hi))));
    } else if (type === "house" || type === "apartment" || type === "villa") {
      const [lo, hi] = { house: [5e6, 40e6], apartment: [3e6, 25e6], villa: [15e6, 80e6] }[type];
      price = nice(Math.exp(between(Math.log(lo), Math.log(hi))));
      rentalPeriod = "month";
    } else {
      const [lo, hi] = { ruko: [60e6, 400e6], office: [80e6, 800e6], warehouse: [100e6, 900e6] }[type as "ruko" | "office" | "warehouse"];
      price = nice(Math.exp(between(Math.log(lo), Math.log(hi))));
      rentalPeriod = "year";
    }

    const beds = { house: 2 + Math.floor(r() * 4), apartment: 1 + Math.floor(r() * 3), villa: 2 + Math.floor(r() * 4), ruko: 0, office: 0, warehouse: 0, land: 0 }[type];
    const baths = type === "land" ? 0 : Math.max(1, Math.min(beds, 1 + Math.floor(r() * 4)));
    const land = type === "apartment" || type === "office" ? null : Math.round(between(type === "warehouse" ? 400 : 60, type === "land" ? 1500 : type === "warehouse" ? 3000 : type === "villa" ? 700 : 400));
    const building = type === "land" ? null : Math.round(type === "apartment" ? between(28, 140) : land ? land * between(0.5, 0.95) : between(80, 400));
    const facilities = type === "land" ? [] : DEFAULT_FACILITIES.filter(() => r() < 0.3);

    rows.push({
      title: `${pick(ADJ)} ${LABEL[type]} in ${district}`,
      listingType: rent ? "rent" : "sell",
      price,
      rentalPeriod,
      propertyType: type,
      address: `${pick(STREETS)} No. ${1 + Math.floor(r() * 120)}`,
      village,
      district,
      city: c.city,
      province: c.province,
      postalCode: String(10000 + Math.floor(r() * 80000)),
      landArea: land,
      buildingArea: building,
      bedrooms: beds,
      bathrooms: baths,
      facilities,
      electricityWatts: type === "land" ? null : pick([1300, 2200, 3500, 4400, 6600, 7700, 10600]),
      ...coords(c, district, village),
      salesCode: pick(salesCodes),
      status: "available",
      notes: r() < 0.2 ? "Owner is flexible on price." : null,
    });
  }

  // ~12% closed (sold/rented, with a linked deal), ~8% reserved.
  const closedIdx = new Set<number>();
  const reservedIdx = new Set<number>();
  rows.forEach((_, i) => {
    const x = r();
    if (x < 0.12) closedIdx.add(i);
    else if (x < 0.2) reservedIdx.add(i);
  });
  rows.forEach((row, i) => {
    if (closedIdx.has(i)) row.status = row.listingType === "sell" ? "sold" : "rented";
    else if (reservedIdx.has(i)) row.status = "reserved";
  });

  const inserted: { id: string }[] = [];
  for (let i = 0; i < rows.length; i += 50) {
    inserted.push(...(await db.insert(listings).values(rows.slice(i, i + 50)).returning({ id: listings.id })));
  }

  const dealRows: (typeof deals.$inferInsert)[] = [];
  const dealFor = (row: typeof rows[number], listingId: string | null) => {
    const sale = row.listingType === "sell";
    const finalPrice = nice(row.price * between(sale ? 0.9 : 0.92, 1));
    const pct = sale ? Number(between(1.5, 3).toFixed(1)) : null;
    const start = iso(Math.floor(between(0, 80)));
    const ago = Math.floor(between(0, 90));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - ago + 5);
    const end = new Date(startDate);
    end.setFullYear(end.getFullYear() + 1);
    void start;
    return {
      listingId,
      source: (listingId ? "listing" : "manual") as "listing" | "manual",
      dealType: (sale ? "sale" : "rent") as "sale" | "rent",
      propertyType: row.propertyType,
      address: row.address,
      village: row.village,
      district: row.district,
      city: row.city,
      province: row.province,
      listingPrice: listingId ? row.price : null,
      finalPrice,
      dealDate: iso(ago),
      buyerName: pick(BUYERS),
      buyerPhone: `08${Math.floor(1e9 + r() * 8e9)}`,
      contractStart: sale ? null : iso(ago - 5),
      contractEnd: sale ? null : `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`,
      // ~1/3 of listed deals were closed by a different agent than the one who held the listing.
      salesCode: listingId && r() < 0.35 ? pick(salesCodes.filter((c) => c !== row.salesCode)) ?? row.salesCode : row.salesCode,
      listingSalesCode: listingId ? row.salesCode : null,
      commissionPercent: pct,
      commissionAmount: Math.round(sale ? (finalPrice * pct!) / 100 : finalPrice * 0.1),
    } satisfies typeof deals.$inferInsert;
  };

  // ~1/3 of deals are cash; the rest go through a bank (BCA, Mandiri, BNI, BRI… weighted by market share).
  const BANK_POOL = ["BCA", "BCA", "BCA", "Mandiri", "Mandiri", "BNI", "BRI", "BTN", "CIMB Niaga", "Permata", "BSI (Bank Syariah Indonesia)", "Danamon"];
  const payment = () => (r() < 0.35 ? { paymentType: "cash" as const, bankName: null } : { paymentType: "bank" as const, bankName: pick(BANK_POOL) });

  for (const i of closedIdx) dealRows.push({ ...dealFor(rows[i], inserted[i].id), ...payment() });
  // A few off-market deals that were never listed.
  for (let k = 0; k < Math.max(3, Math.round(count / 12)); k++) {
    const base = rows[Math.floor(r() * rows.length)];
    dealRows.push({ ...dealFor(base, null), ...payment(), notes: "Off-market deal." });
  }
  for (let i = 0; i < dealRows.length; i += 50) await db.insert(deals).values(dealRows.slice(i, i + 50));

  return { listings: rows.length, deals: dealRows.length, closed: closedIdx.size, reserved: reservedIdx.size };
}

export { sql };
