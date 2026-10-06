/**
 * Builds map tiles from https://github.com/cahyadsn/wilayah_boundaries (MIT, Kepmendagri 2025 codes).
 *
 *   bun run geo:build                       # provinces, cities, districts (whole country) + villages for cities that have listings
 *   bun run geo:build --villages=all        # villages for every city (~100+ MB, slow)
 *   bun run geo:build --city="Kota Makassar"   # add villages for specific cities (matched by name)
 *
 * Districts and villages of cities that have listings are then upgraded to the official, much more detailed
 * BIG (Badan Informasi Geospasial) 1:10,000 boundaries via its public ArcGIS service. Disable with --no-big.
 *
 * Output (public/geo):
 *   provinces.json            all provinces
 *   kab/<prov>.json           cities/regencies of a province
 *   kec/<kab>.json            districts (kecamatan) of a city, e.g. kec/73.71.json
 *   kel/<kab>.json            villages (kelurahan/desa) of a city (cities with listings only; has geometry)
 *   names/kel/<kab>.json      village NAMES for every city (no geometry, tiny) - feeds the listing form dropdown
 */
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { config } from "dotenv";
import postgres from "postgres";
import { buildRegencyIndex, cityKey, provinceKey } from "../src/lib/geo";

config({ path: ".env.local", quiet: true });

const RAW = "https://raw.githubusercontent.com/cahyadsn/wilayah_boundaries/main/db";
const OUT = "public/geo";
const PROV_CODES = [11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 31, 32, 33, 34, 35, 36, 51, 52, 53, 61, 62, 63, 64, 65, 71, 72, 73, 74, 75, 76, 81, 82, 91, 92, 93, 94, 95, 96];

type Pt = [number, number];
type PF = { properties: { kode: string; name: string } };
type Feat = { properties: Record<string, unknown> };
type Row = { kode: string; nama: string; rings: Pt[][][] }; // multipolygon: polygon -> ring -> [lng, lat]

async function get(url: string): Promise<string | null> {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url);
      if (r.status === 404) return null;
      if (r.ok) return await r.text();
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 500 * (i + 1)));
  }
  throw new Error(`Failed to fetch ${url}`);
}

/** Parses the INSERT rows of a cahyadsn SQL dump. Path is [[[[lat,lng],...]]] (lat first!). */
function parse(sql: string): Row[] {
  const rows: Row[] = [];
  const re = /\('([\d.]+)','((?:[^']|'')*)',\s*[-+\d.eE]+\s*,\s*[-+\d.eE]+\s*,\s*'(\[[^']*\])'\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql))) {
    try {
      let raw = JSON.parse(m[3]) as unknown as number[][][][];
      // Rows are either a MultiPolygon (4 levels) or a plain Polygon (3 levels).
      if (typeof (raw as unknown as number[][][])[0]?.[0]?.[0] === "number") raw = [raw as unknown as number[][][]];
      rows.push({
        kode: m[1],
        nama: m[2].replace(/''/g, "'"),
        rings: raw.map((poly) => poly.map((ring) => ring.map(([lat, lng]) => [lng, lat] as Pt))),
      });
    } catch {
      /* skip malformed geometry */
    }
  }
  return rows;
}

function dp(pts: Pt[], tol: number): Pt[] {
  if (pts.length < 3) return pts;
  const keep = new Array(pts.length).fill(false);
  keep[0] = keep[pts.length - 1] = true;
  const stack: [number, number][] = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const [x1, y1] = pts[a];
    const [x2, y2] = pts[b];
    const dx = x2 - x1, dy = y2 - y1;
    const L = Math.hypot(dx, dy);
    let md = 0, mi = -1;
    for (let i = a + 1; i < b; i++) {
      const [x, y] = pts[i];
      const d = L ? Math.abs(dy * x - dx * y + x2 * y1 - y2 * x1) / L : Math.hypot(x - x1, y - y1);
      if (d > md) { md = d; mi = i; }
    }
    if (md > tol) { keep[mi] = true; stack.push([a, mi], [mi, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

const ringArea = (r: Pt[]) => {
  let s = 0;
  for (let i = 0; i < r.length - 1; i++) s += (r[i + 1][0] - r[i][0]) * (r[i + 1][1] + r[i][1]);
  return s;
};

/** Simplify + round + wind rings the way plotly/d3 expects (exterior positive area, holes negative). */
function feature(row: Row, tol: number, dec: number, props: Record<string, unknown>) {
  const f = 10 ** dec;
  const coords = row.rings
    .map((poly) =>
      poly
        .map((ring, i) => {
          // The source is already simplified: only thin out big rings, never collapse small ones.
          const base = ring.length > 60 ? dp(ring, tol) : ring;
          let s = base.map(([x, y]) => [Math.round(x * f) / f, Math.round(y * f) / f] as Pt);
          if (s.length < 4) return i === 0 ? null : null;
          if (s[0][0] !== s[s.length - 1][0] || s[0][1] !== s[s.length - 1][1]) s = [...s, s[0]];
          const wantPositive = i === 0;
          if (ringArea(s) > 0 !== wantPositive) s = s.reverse();
          return s;
        })
        .filter(Boolean) as Pt[][],
    )
    .filter((poly) => poly.length > 0 && poly[0] && ringArea(poly[0]) !== 0);
  if (!coords.length) return null;
  return { type: "Feature", properties: props, geometry: { type: "MultiPolygon", coordinates: coords } };
}

const strip = (n: string) =>
  n.replace(/^(Provinsi|Kabupaten|Kab\.|Kecamatan|Kec\.|Kelurahan|Kel\.|Desa)\s+/i, "").replace(/\s+/g, " ").trim();

function write(path: string, features: unknown[]) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify({ type: "FeatureCollection", features }));
}

async function pool<T, R>(items: T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (i < items.length) {
        const k = i++;
        out[k] = await fn(items[k]);
      }
    }),
  );
  return out;
}


/* ---------- BIG (official 1:10,000) detail layer ---------- */
const BIG = "https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH";

async function arc(layer: string, where: string, extra: Record<string, string>) {
  const qs = new URLSearchParams({ where, f: "geojson", geometryPrecision: "5", ...extra });
  const url = `${BIG}/${layer}/MapServer/0/query?${qs}`;
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(120_000) });
      if (r.ok) {
        const d = (await r.json()) as { features?: { properties: Record<string, string>; geometry: { type: string; coordinates: unknown } | null }[]; error?: unknown };
        if (d.features) return d.features;
      }
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
  }
  return null;
}

/** All (province, city) name pairs in BIG whose city name contains `core` (one row per district, so we dedupe). */
async function findCities(core: string): Promise<{ province: string; city: string }[]> {
  const qs = new URLSearchParams({
    where: `UPPER(WADMKK) LIKE ${sqlStr("%" + core.toUpperCase() + "%")}`,
    outFields: "WADMPR,WADMKK",
    returnGeometry: "false",
    f: "json",
  });
  try {
    const r = await fetch(`${BIG}/Administrasi_AR_Kecamatan_10K/MapServer/0/query?${qs}`, { signal: AbortSignal.timeout(60_000) });
    const d = (await r.json()) as { features?: { attributes: Record<string, string> }[] };
    const seen = new Map<string, { province: string; city: string }>();
    for (const f of d.features ?? []) {
      const province = String(f.attributes.WADMPR ?? "").trim();
      const city = String(f.attributes.WADMKK ?? "").trim();
      if (province && city) seen.set(`${province}|${city}`, { province, city });
    }
    return [...seen.values()];
  } catch {
    return [];
  }
}

const sqlStr = (v: string) => `'${v.replace(/'/g, "''")}'`;

function toRows(feats: NonNullable<Awaited<ReturnType<typeof arc>>>, kodeOf: (p: Record<string, string>) => string, nameOf: (p: Record<string, string>) => string): Row[] {
  const rows: Row[] = [];
  for (const f of feats) {
    if (!f.geometry) continue;
    const polys = (f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates) as Pt[][][];
    rows.push({ kode: kodeOf(f.properties), nama: nameOf(f.properties), rings: polys });
  }
  return rows;
}

/** Replace a city's district + village tiles with BIG's 1:10,000 geometry. Returns true on success. */
async function upgradeCityWithBig(cityKode: string, cityName: string, provinceName: string, withVillages: boolean): Promise<string> {
  // Search by the distinctive part of the name ("Jakarta Selatan"), then pick the exact province + city.
  const core = cityName.replace(/^(kota|kabupaten|kab\.?)\s+/i, "").replace(/\b(administrasi|adm\.?)\s+/gi, "").trim();
  const candidates = (await findCities(core)).filter((c) => provinceKey(c.province) === provinceKey(provinceName));
  const idx = buildRegencyIndex(candidates.map((c) => ({ properties: { name: c.city, type: /^kota\b/i.test(c.city) ? "Kota" : "Kabupaten" }, c })));
  const found = (idx.get(cityKey(cityName)) as { c: { province: string; city: string } } | undefined)?.c;
  if (!found) return `not found in BIG (${candidates.length ? "name mismatch" : "no candidates"})`;
  const prov = found.province;
  const hit = { n: found.city };
  const where = `WADMPR=${sqlStr(prov)} AND WADMKK=${sqlStr(hit.n)}`;
  const slug = (n: string) => n.toLowerCase().replace(/[^a-z0-9]+/g, "");

  const kecFeats = await arc("Administrasi_AR_Kecamatan_10K", where, { outFields: "WADMKC", maxAllowableOffset: "0.00012" });
  if (!kecFeats?.length) return "BIG returned no districts";
  const kecRows = toRows(kecFeats, (p) => `${cityKode}.${slug(p.WADMKC)}`, (p) => p.WADMKC);
  // BIG may split one district into several polygons rows; merge by code.
  const merged = new Map<string, Row>();
  for (const r of kecRows) {
    const m = merged.get(r.kode);
    if (m) m.rings.push(...r.rings);
    else merged.set(r.kode, r);
  }
  write(`${OUT}/kec/${cityKode}.json`, [...merged.values()].map((r) => feature(r, 0.00002, 5, { kode: r.kode, name: strip(r.nama) })).filter(Boolean));
  let msg = `${merged.size} districts`;

  if (withVillages) {
    const kel = await arc("Administrasi_AR_KelDesa_10K", where, { outFields: "WADMKC,WADMKD", maxAllowableOffset: "0.00006" });
    if (kel?.length) {
      const rows = toRows(kel, (p) => `${cityKode}.${slug(p.WADMKC)}.${slug(p.WADMKD)}`, (p) => p.WADMKD);
      const byKode = new Map<string, Row & { district: string }>();
      const district = new Map<string, string>();
      kel.forEach((f) => district.set(`${cityKode}.${slug(f.properties.WADMKC)}.${slug(f.properties.WADMKD)}`, `${cityKode}.${slug(f.properties.WADMKC)}`));
      for (const r of rows) {
        const m = byKode.get(r.kode);
        if (m) m.rings.push(...r.rings);
        else byKode.set(r.kode, { ...r, district: district.get(r.kode)! });
      }
      write(
        `${OUT}/kel/${cityKode}.json`,
        [...byKode.values()].map((r) => feature(r, 0.00001, 5, { kode: r.kode, name: strip(r.nama), district: r.district })).filter(Boolean),
      );
      msg += `, ${byKode.size} villages`;
    } else msg += ", villages unavailable (kept existing)";
  }
  return msg;
}

async function main() {
  const args = process.argv.slice(2);
  const villagesAll = args.includes("--villages=all");
  const extraCities = args.filter((a) => a.startsWith("--city=")).map((a) => a.slice(7));

  // 1. Provinces
  console.log("Provinces…");
  const provRows: Row[] = [];
  for (let i = 1; i <= 8; i++) {
    const sql = await get(`${RAW}/prov/wilayah_boundaries_prov_${i}.sql`);
    if (sql) provRows.push(...parse(sql));
  }
  const provFeatures = provRows.map((r) => feature(r, 0.02, 2, { kode: r.kode, name: strip(r.nama) })).filter(Boolean);
  write(`${OUT}/provinces.json`, provFeatures);
  const provList = provFeatures as unknown as PF[];
  console.log(`  ${provFeatures.length} provinces`);

  // 2. Cities / regencies per province
  console.log("Cities / regencies…");
  const kabByProv = new Map<string, { kode: string; name: string; province: string; feature: Feat }[]>();
  await pool(PROV_CODES, 6, async (pc) => {
    const sql = await get(`${RAW}/kab/wilayah_boundaries_kab_${pc}.sql`);
    if (!sql) return;
    const provName = provList.find((f) => f.properties.kode === String(pc))?.properties.name ?? "";
    const list = parse(sql).map((r) => {
      const isKota = /^Kota\b/i.test(r.nama);
      // Keep the "Kota" prefix (so "Kota Bandung" and "Bandung" stay distinct), drop "Kabupaten".
      const name = isKota ? r.nama.trim() : strip(r.nama);
      const feat = feature(r, 0.006, 3, { kode: r.kode, name, type: isKota ? "Kota" : "Kabupaten", province: provName });
      return { kode: r.kode, name, province: provName, feature: feat as Feat };
    }).filter((x) => x.feature);
    kabByProv.set(String(pc), list);
    write(`${OUT}/kab/${pc}.json`, list.map((x) => x.feature));
  });
  const totalKab = [...kabByProv.values()].reduce((n, l) => n + l.length, 0);
  console.log(`  ${totalKab} cities/regencies`);

  // 3. Districts (kecamatan): one file per province, split per city code
  console.log("Districts…");
  let totalKec = 0;
  const districtName = new Map<string, string>(); // "73.71.01" -> "Mariso"
  await pool(PROV_CODES, 4, async (pc) => {
    const sql = await get(`${RAW}/kec/wilayah_boundaries_kec_${pc}.sql`);
    if (!sql) return;
    const byKab = new Map<string, unknown[]>();
    for (const r of parse(sql)) {
      districtName.set(r.kode, strip(r.nama));
      const kab = r.kode.split(".").slice(0, 2).join(".");
      const f = feature(r, 0.0015, 4, { kode: r.kode, name: strip(r.nama) });
      if (!f) continue;
      (byKab.get(kab) ?? byKab.set(kab, []).get(kab)!).push(f);
      totalKec++;
    }
    for (const [kab, feats] of byKab) write(`${OUT}/kec/${kab}.json`, feats);
  });
  console.log(`  ${totalKec} districts`);

  // 3b. Village names for EVERY city (names only: cheap, so the listing form can offer a village dropdown anywhere)
  if (!args.includes("--no-names")) {
    const all = [...kabByProv.values()].flat().map((k) => k.kode);
    const todo = all.filter((k) => args.includes("--force") || !existsSync(`${OUT}/names/kel/${k}.json`));
    console.log(`Village names for ${todo.length} of ${all.length} cities (downloads ~350 MB the first time)…`);
    let done = 0, total = 0;
    await pool(todo, 6, async (kab) => {
      const sql = await get(`${RAW}/kel/${kab.split(".")[0]}/wilayah_boundaries_kel_${kab}.sql`);
      const rows: { name: string; district: string }[] = [];
      if (sql) {
        const re = /\('([\d.]+)','((?:[^']|'')*)'/g;
        let m: RegExpExecArray | null;
        while ((m = re.exec(sql))) {
          const parts = m[1].split(".");
          if (parts.length < 4) continue; // only village rows ("73.71.01.1001")
          rows.push({ name: strip(m[2].replace(/''/g, "'")), district: districtName.get(parts.slice(0, 3).join(".")) ?? "" });
        }
      }
      mkdirSync(`${OUT}/names/kel`, { recursive: true });
      writeFileSync(`${OUT}/names/kel/${kab}.json`, JSON.stringify(rows));
      total += rows.length;
      if (++done % 50 === 0) console.log(`  ${done}/${todo.length}`);
    });
    console.log(`  ${total} village names written`);
  }

  // 4. Villages (kelurahan/desa): only for the cities that matter
  let kabCodes: string[] = [];
  if (villagesAll) {
    kabCodes = [...kabByProv.values()].flat().map((k) => k.kode);
  } else {
    const wanted: { province: string; city: string }[] = extraCities.map((c) => ({ province: "", city: c }));
    if (process.env.DATABASE_URL) {
      const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
      wanted.push(...(await sql<{ province: string; city: string }[]>`select distinct province, city from listings`));
      await sql.end();
    }
    for (const w of wanted) {
      const pool_ = w.province
        ? (kabByProv.get(PROV_CODES.find((pc) => provinceKey((provList.find((f) => f.properties.kode === String(pc))?.properties.name ?? "")) === provinceKey(w.province))?.toString() ?? "") ?? [])
        : [...kabByProv.values()].flat();
      const idx = buildRegencyIndex(pool_.map((k) => ({ properties: { name: k.name, type: k.feature.properties.type as string }, kode: k.kode })));
      const hit = idx.get(cityKey(w.city)) as { kode: string } | undefined;
      if (hit) kabCodes.push(hit.kode);
      else console.log(`  (no boundary match for "${w.city}", skipping villages)`);
    }
    kabCodes = [...new Set(kabCodes)];
  }
  const wantedCities = kabCodes.slice();
  console.log(`Villages for ${kabCodes.length} cities…`);
  let totalKel = 0;
  await pool(kabCodes, 4, async (kab) => {
    if (!villagesAll && existsSync(`${OUT}/kel/${kab}.json`) && !args.includes("--force")) return;
    const sql = await get(`${RAW}/kel/${kab.split(".")[0]}/wilayah_boundaries_kel_${kab}.sql`);
    if (!sql) return void console.log(`  no village data for ${kab}`);
    const feats = parse(sql)
      .map((r) => feature(r, 0.0006, 5, { kode: r.kode, name: strip(r.nama), district: r.kode.split(".").slice(0, 3).join(".") }))
      .filter(Boolean);
    totalKel += feats.length;
    write(`${OUT}/kel/${kab}.json`, feats);
  });
  console.log(`  ${totalKel} villages written`);

  // 5. Upgrade the same cities with official BIG 1:10,000 geometry (much more detailed than the base data).
  if (!args.includes("--no-big") && wantedCities.length) {
    console.log(`Upgrading ${wantedCities.length} cities with BIG 1:10,000 boundaries…`);
    for (const kode of wantedCities) {
      const entry = [...kabByProv.values()].flat().find((k) => k.kode === kode);
      if (!entry) continue;
      const res = await upgradeCityWithBig(kode, entry.name, entry.province, true);
      console.log(`  ${entry.name}: ${res}`);
    }
  }
  console.log("Done.");
}

await main();
