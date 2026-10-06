import { existsSync, readFileSync } from "node:fs";
import { buildRegencyIndex, cityKey, placeKey, provinceKey } from "../src/lib/geo";

type Pt = [number, number];
type Feat = { properties: Record<string, string>; geometry: { coordinates: Pt[][][] } };

const cache = new Map<string, Feat[] | null>();
function tile(path: string): Feat[] | null {
  if (!cache.has(path)) cache.set(path, existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")).features as Feat[]) : null);
  return cache.get(path)!;
}

const inRing = ([x, y]: Pt, r: Pt[]) => {
  let c = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [xi, yi] = r[i], [xj, yj] = r[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};
export const inside = (p: Pt, f: Feat) =>
  f.geometry.coordinates.some((poly) => inRing(p, poly[0]) && !poly.slice(1).some((h) => inRing(p, h)));

/** Looks up the most specific boundary we have for a place: village, else district, else city. */
export function findPlace(province: string, city: string, district: string, village: string): Feat | null {
  const provs = tile("public/geo/provinces.json");
  const prov = provs?.find((f) => provinceKey(f.properties.name) === provinceKey(province));
  const kab = prov ? tile(`public/geo/kab/${prov.properties.kode}.json`) : null;
  const cityF = kab ? (buildRegencyIndex(kab).get(cityKey(city)) as Feat | undefined) : undefined;
  if (!cityF) return null;
  const kode = cityF.properties.kode;
  const kec = tile(`public/geo/kec/${kode}.json`);
  const dist = kec?.find((f) => placeKey(f.properties.name) === placeKey(district));
  const kel = dist ? tile(`public/geo/kel/${kode}.json`) : null;
  const vil = kel?.find((f) => f.properties.district === dist!.properties.kode && placeKey(f.properties.name) === placeKey(village));
  return vil ?? dist ?? cityF;
}

/** Uniform-ish random point inside a feature (rejection sampling in the biggest polygon's bbox). */
export function randomPointIn(f: Feat, rnd: () => number): Pt | null {
  const area = (r: Pt[]) => Math.abs(r.reduce((s, p, i) => s + (i ? (p[0] - r[i - 1][0]) * (p[1] + r[i - 1][1]) : 0), 0));
  const poly = [...f.geometry.coordinates].sort((a, b) => area(b[0]) - area(a[0]))[0];
  const xs = poly[0].map((p) => p[0]), ys = poly[0].map((p) => p[1]);
  const [w, e, s, n] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  for (let i = 0; i < 400; i++) {
    const p: Pt = [w + rnd() * (e - w), s + rnd() * (n - s)];
    if (inRing(p, poly[0]) && !poly.slice(1).some((h) => inRing(p, h))) return p;
  }
  return null;
}
