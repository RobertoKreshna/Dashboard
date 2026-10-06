import "server-only";
import { and, asc, count, desc, eq, gte, ilike, inArray, lte, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  listingPhotos,
  listings,
  publicListingPhotos,
  publicListings,
  salesCodes,
} from "@/db/schema";

export const PAGE_SIZE = 20;

export type Scope = "staff" | "public";

export type ListingFilters = {
  q: string;
  type: string;
  propertyType: string;
  province: string;
  city: string;
  district: string;
  village: string;
  minPrice: number | null;
  maxPrice: number | null;
  beds: number | null;
  baths: number | null;
  salesCode: string;
  status: string; // "all" disables the status filter
  sort: string;
  page: number;
};

type Params = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const num = (v: string) => (v !== "" && !Number.isNaN(Number(v)) ? Number(v) : null);

const PROPERTY_TYPE_VALUES = ["house", "apartment", "land", "ruko", "office", "warehouse", "villa", "other"];
const STATUS_VALUES = ["available", "reserved", "sold", "rented", "all", "active"];
const SORT_VALUES = ["newest", "oldest", "price_asc", "price_desc"];
const text = (v: string, max = 100) => v.slice(0, max);
const clampInt = (n: number | null, max: number) => (n === null ? null : Math.min(Math.max(Math.trunc(n), 0), max));

/** Reads filters from the URL. Everything is whitelisted or clamped, so a hand-edited URL can't reach the database as junk. */
export function parseListingFilters(sp: Params): ListingFilters {
  const type = one(sp.type);
  const propertyType = one(sp.propertyType);
  const status = sp.status === undefined ? "available" : one(sp.status);
  const sort = one(sp.sort) || "newest";
  return {
    q: text(one(sp.q).trim()),
    type: type === "sell" || type === "rent" ? type : "",
    propertyType: PROPERTY_TYPE_VALUES.includes(propertyType) ? propertyType : "",
    province: text(one(sp.province)),
    city: text(one(sp.city)),
    district: text(one(sp.district)),
    village: text(one(sp.village)),
    minPrice: clampInt(num(one(sp.minPrice).replace(/\D/g, "")), 1e15),
    maxPrice: clampInt(num(one(sp.maxPrice).replace(/\D/g, "")), 1e15),
    beds: clampInt(num(one(sp.beds)), 50),
    baths: clampInt(num(one(sp.baths)), 50),
    salesCode: text(one(sp.salesCode), 40),
    status: STATUS_VALUES.includes(status) ? status : "available",
    sort: SORT_VALUES.includes(sort) ? sort : "newest",
    page: Math.min(10_000, Math.max(1, Math.trunc(Number(one(sp.page))) || 1)),
  };
}

function source(scope: Scope) {
  // The view exposes the same column names as the table (minus internal fields).
  return (scope === "public" ? publicListings : listings) as unknown as typeof listings;
}

function buildWhere(t: typeof listings, f: ListingFilters): SQL | undefined {
  const c: (SQL | undefined)[] = [];
  if (f.q) {
    const like = `%${f.q.replace(/[%_]/g, "\\$&")}%`;
    c.push(or(ilike(t.title, like), ilike(t.address, like), ilike(t.id, like)));
  }
  if (f.type === "sell" || f.type === "rent") c.push(eq(t.listingType, f.type));
  if (f.propertyType) c.push(eq(t.propertyType, f.propertyType as never));
  if (f.province) c.push(eq(t.province, f.province));
  if (f.city) c.push(eq(t.city, f.city));
  if (f.district) c.push(eq(t.district, f.district));
  if (f.village) c.push(eq(t.village, f.village));
  if (f.minPrice !== null) c.push(gte(t.price, f.minPrice));
  if (f.maxPrice !== null) c.push(lte(t.price, f.maxPrice));
  if (f.beds !== null) c.push(gte(t.bedrooms, f.beds));
  if (f.baths !== null) c.push(gte(t.bathrooms, f.baths));
  if (f.salesCode) c.push(eq(t.salesCode, f.salesCode));
  if (f.status === "active") c.push(inArray(t.status, ["available", "reserved"]));
  else if (f.status && f.status !== "all") c.push(eq(t.status, f.status as never));
  return and(...c);
}

function orderBy(t: typeof listings, sort: string) {
  switch (sort) {
    case "price_asc":
      return [asc(t.price), desc(t.createdAt)];
    case "price_desc":
      return [desc(t.price), desc(t.createdAt)];
    case "oldest":
      return [asc(t.createdAt)];
    default:
      return [desc(t.createdAt)];
  }
}

export async function queryListings(scope: Scope, f: ListingFilters) {
  const t = source(scope);
  const where = buildWhere(t, f);
  const coverPath =
    scope === "public"
      ? (publicListings.coverPath as unknown as SQL<string | null>)
      : sql<string | null>`(select p.path from ${listingPhotos} p where p.listing_id = listings.id
          order by p.is_cover desc, p.position asc, p.created_at asc limit 1)`;
  const agentName =
    scope === "public"
      ? (publicListings.agentName as unknown as SQL<string | null>)
      : sql<string | null>`(select s.full_name from ${salesCodes} s where s.code = listings.sales_code)`;

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: t.id,
        title: t.title,
        listingType: t.listingType,
        price: t.price,
        rentalPeriod: t.rentalPeriod,
        propertyType: t.propertyType,
        address: t.address,
        village: t.village,
        district: t.district,
        city: t.city,
        province: t.province,
        landArea: t.landArea,
        buildingArea: t.buildingArea,
        bedrooms: t.bedrooms,
        bathrooms: t.bathrooms,
        salesCode: t.salesCode,
        status: t.status,
        createdAt: t.createdAt,
        coverPath,
        agentName,
      })
      .from(t)
      .where(where)
      .orderBy(...orderBy(t, f.sort))
      .limit(PAGE_SIZE)
      .offset((f.page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(t).where(where),
  ]);
  return { rows, total, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export type ListingRow = Awaited<ReturnType<typeof queryListings>>["rows"][number];

/** City -> district pairs so the filter dropdowns can cascade. */
export async function getLocationOptions(scope: Scope) {
  const t = source(scope);
  const rows = await db
    .selectDistinct({ province: t.province, city: t.city, district: t.district, village: t.village })
    .from(t)
    .orderBy(asc(t.province), asc(t.city), asc(t.district), asc(t.village));
  return rows;
}

export async function getSalesCodeOptions(scope: Scope) {
  if (scope === "public") {
    return db
      .selectDistinct({ code: publicListings.salesCode, name: publicListings.agentName })
      .from(publicListings)
      .orderBy(asc(publicListings.salesCode));
  }
  return db
    .select({ code: salesCodes.code, name: salesCodes.fullName })
    .from(salesCodes)
    .orderBy(asc(salesCodes.code));
}

export async function getListingDetail(scope: Scope, id: string) {
  const t = source(scope);
  const [row] =
    scope === "public"
      ? await db.select().from(publicListings).where(eq(publicListings.id, id)).limit(1)
      : await db
          .select({
            ...getTableColumnsSafe(),
            agentName: salesCodes.fullName,
            agentPhone: salesCodes.phone,
          })
          .from(listings)
          .innerJoin(salesCodes, eq(salesCodes.code, listings.salesCode))
          .where(eq(listings.id, id))
          .limit(1);
  if (!row) return null;
  const photos =
    scope === "public"
      ? await db
          .select()
          .from(publicListingPhotos)
          .where(eq(publicListingPhotos.listingId, id))
          .orderBy(desc(publicListingPhotos.isCover), asc(publicListingPhotos.position))
      : await db
          .select()
          .from(listingPhotos)
          .where(eq(listingPhotos.listingId, id))
          .orderBy(asc(listingPhotos.position), asc(listingPhotos.createdAt));
  void t;
  return { listing: row as typeof row & { notes?: string | null; agentPhone?: string | null }, photos };
}

function getTableColumnsSafe() {
  return {
    id: listings.id,
    title: listings.title,
    listingType: listings.listingType,
    price: listings.price,
    rentalPeriod: listings.rentalPeriod,
    propertyType: listings.propertyType,
    address: listings.address,
    village: listings.village,
    district: listings.district,
    city: listings.city,
    province: listings.province,
    postalCode: listings.postalCode,
    landArea: listings.landArea,
    buildingArea: listings.buildingArea,
    bedrooms: listings.bedrooms,
    bathrooms: listings.bathrooms,
    facilities: listings.facilities,
    electricityWatts: listings.electricityWatts,
    latitude: listings.latitude,
    longitude: listings.longitude,
    salesCode: listings.salesCode,
    status: listings.status,
    notes: listings.notes,
    createdAt: listings.createdAt,
    updatedAt: listings.updatedAt,
  };
}

/* ---------- Public dashboard aggregates (listings only; never deals) ---------- */

export async function getPublicSummary() {
  const rows = await db
    .select({
      listingType: publicListings.listingType,
      status: publicListings.status,
      n: count(),
    })
    .from(publicListings)
    .groupBy(publicListings.listingType, publicListings.status);
  const byType = { sell: 0, rent: 0 };
  const byStatus = { available: 0, reserved: 0, sold: 0, rented: 0 };
  // status × type, so the UI can say how many "available" are for sale vs for rent.
  const cross = {
    available: { sell: 0, rent: 0 },
    reserved: { sell: 0, rent: 0 },
    sold: { sell: 0, rent: 0 },
    rented: { sell: 0, rent: 0 },
  };
  let total = 0;
  for (const r of rows) {
    cross[r.status][r.listingType] += r.n;
    byType[r.listingType] += r.n;
    byStatus[r.status] += r.n;
    total += r.n;
  }
  return { total, byType, byStatus, cross };
}

/** Map shading follows every active filter except the location itself (the map *is* the location picker). */
export async function getMapCounts(f: ListingFilters) {
  const t = source("public");
  const noLoc = { ...f, province: "", city: "", district: "", village: "" };
  const rows = await db
    .select({ province: t.province, city: t.city, n: count() })
    .from(t)
    .where(buildWhere(t, noLoc))
    .groupBy(t.province, t.city);
  const byProvince = new Map<string, number>();
  for (const r of rows) byProvince.set(r.province, (byProvince.get(r.province) ?? 0) + r.n);

  // Deeper levels only exist once their parent is chosen.
  const districtCounts = f.city
    ? (
        await db
          .select({ name: t.district, n: count() })
          .from(t)
          .where(buildWhere(t, { ...noLoc, city: f.city, province: f.province }))
          .groupBy(t.district)
      ).map((r) => ({ name: r.name, value: r.n }))
    : [];
  const villageCounts =
    f.city && f.district
      ? (
          await db
            .select({ name: t.village, n: count() })
            .from(t)
            .where(buildWhere(t, { ...noLoc, city: f.city, province: f.province, district: f.district }))
            .groupBy(t.village)
        ).map((r) => ({ name: r.name, value: r.n }))
      : [];

  return {
    provinceCounts: [...byProvince.entries()].map(([name, value]) => ({ name, value })),
    cityCounts: rows.map((r) => ({ name: r.city, value: r.n, province: r.province })),
    districtCounts,
    villageCounts,
  };
}

export type MapPoint = {
  id: string;
  title: string;
  listingType: "sell" | "rent";
  price: number;
  rentalPeriod: "month" | "year" | null;
  lat: number;
  lng: number;
};

/** One dot per listing, only once a district is chosen (at city level they pile up). Uses the same filters as the list. */
export async function getMapPoints(f: ListingFilters): Promise<MapPoint[]> {
  if (!f.city || !f.district) return [];
  const t = source("public");
  const rows = await db
    .select({
      id: t.id,
      title: t.title,
      listingType: t.listingType,
      price: t.price,
      rentalPeriod: t.rentalPeriod,
      lat: t.latitude,
      lng: t.longitude,
    })
    .from(t)
    .where(and(buildWhere(t, f), sql`${t.latitude} is not null and ${t.longitude} is not null`))
    .limit(500);
  return rows.map((r) => ({ ...r, lat: r.lat!, lng: r.lng! }));
}

export type PriceBounds = { all: [number, number]; sell: [number, number] | null; rent: [number, number] | null };

/** Min/max price per listing type (public view), used to scale the price slider. */
export async function getPriceBounds(): Promise<PriceBounds> {
  const rows = await db
    .select({
      type: publicListings.listingType,
      lo: sql<number>`min(${publicListings.price})::float8`,
      hi: sql<number>`max(${publicListings.price})::float8`,
    })
    .from(publicListings)
    .groupBy(publicListings.listingType);
  const fix = (lo: number, hi: number): [number, number] => (hi > lo ? [lo, hi] : [Math.max(1, Math.floor(hi / 2)), Math.max(2, hi)]);
  const get = (t: string) => {
    const r = rows.find((x) => x.type === t);
    return r ? fix(r.lo, r.hi) : null;
  };
  const sell = get("sell");
  const rent = get("rent");
  const all = rows.length ? fix(Math.min(...rows.map((r) => r.lo)), Math.max(...rows.map((r) => r.hi))) : ([1_000_000, 1_000_000_000] as [number, number]);
  return { all, sell, rent };
}
