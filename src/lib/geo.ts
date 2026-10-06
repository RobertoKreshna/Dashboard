/**
 * Matching between free-text location names in the database and the boundary
 * GeoJSON in /public/geo. Pure functions, safe on client and server.
 */

const squash = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z]/g, "");

const PROVINCE_ALIASES: Record<string, string> = {
  kepulauanbangkabelitung: "bangkabelitung",
  diyogyakarta: "yogyakarta",
  specialregionofyogyakarta: "yogyakarta",
  jakartaraya: "jakarta",
  daerahkhususibukotajakarta: "jakarta",
  khususibukotajakarta: "jakarta",
  nanggroeaceh: "aceh",
  nanggroeacehdarussalam: "aceh",
};

export function provinceKey(name: string): string {
  let k = squash(name);
  k = k.replace(/^(provinsi|daerahistimewa|dki|di)/, "");
  return PROVINCE_ALIASES[k] ?? k;
}

function regencyBase(name: string): string {
  // Drop "Kabupaten"/"Kab." and "Administrasi" (as in "Kota Administrasi Jakarta Selatan"); "Kota" is kept on purpose
  // so "Kota Bandung" and the Bandung regency stay distinct.
  return squash(
    name
      .replace(/^(kabupaten|kab\.?)\s+/i, "")
      .replace(/\b(administrasi|adm\.?|admin\.?)\s+/gi, ""),
  );
}

export type RegencyProps = { name: string; type?: string };

/**
 * Keys under which a regency/city feature can be found. `primary` is the exact
 * official name ("Kota Bandung", "Bandung"); `fallback` is the name without the
 * "Kota" prefix ("Jakarta Selatan"), used only when no regency owns that name,
 * so a plain "Bandung" still means the regency, not the city.
 */
export function regencyKeys(p: RegencyProps): { primary: string; fallback: string | null } {
  const n = regencyBase(p.name);
  return { primary: n, fallback: n.startsWith("kota") ? n.slice(4) : null };
}

/** Builds a name → feature index (primary names win over "Kota"-less fallbacks). */
export function buildRegencyIndex<T extends { properties?: unknown }>(features: T[]): Map<string, T> {
  const index = new Map<string, T>();
  for (const f of features) index.set(regencyKeys(f.properties as RegencyProps).primary, f);
  for (const f of features) {
    const fb = regencyKeys(f.properties as RegencyProps).fallback;
    if (fb && !index.has(fb)) index.set(fb, f);
  }
  return index;
}

/** Lookup key for a database city string ("Kota Bandung", "Kabupaten Badung", "Jakarta Selatan"). */
export function cityKey(name: string): string {
  return regencyBase(name);
}

/** Key for district (kecamatan) / village (kelurahan, desa) names. */
export function placeKey(name: string): string {
  return squash(name.replace(/^(kecamatan|kec\.?|kelurahan|kel\.?|desa)\s+/i, ""));
}

/** Province name as listings store it ("DKI Jakarta", "DI Yogyakarta") from the boundary dataset's long form. */
export function provinceLabel(name: string): string {
  return name
    .replace(/^Daerah Khusus Ibukota Jakarta$/i, "DKI Jakarta")
    .replace(/^Daerah Istimewa Yogyakarta$/i, "DI Yogyakarta");
}

/** City name as listings store it: "Kota Administrasi Jakarta Selatan" -> "Jakarta Selatan". */
export function cityLabel(name: string): string {
  return name.replace(/^Kota Administrasi\s+/i, "").replace(/^Administrasi\s+/i, "").trim();
}
