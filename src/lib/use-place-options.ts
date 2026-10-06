"use client";

import { buildRegencyIndex, cityKey, cityLabel, placeKey, provinceKey, provinceLabel } from "@/lib/geo";
import { useGeo, useJson } from "@/lib/use-geo";

type Named = { properties: unknown };
const uniqSorted = (xs: string[]) => [...new Set(xs.filter(Boolean))].sort((a, b) => a.localeCompare(b));
const nameOf = (f: Named) => String((f.properties as { name?: string })?.name ?? "");

/**
 * Option lists for the Province -> City -> District -> Village cascade, from the same boundary files the map
 * uses (so saved names always match the map). Village names come from the map tile when the city has one,
 * otherwise from the name-only list that exists for every city.
 */
export function usePlaceOptions(v: { province: string; city: string; district: string }) {
  const provinces = useGeo("/geo/provinces.json");
  const provFeature = provinces.data?.features.find((f) => provinceKey(nameOf(f)) === provinceKey(v.province));
  const kab = useGeo(provFeature ? `/geo/kab/${provFeature.properties?.kode}.json` : null);
  const cityFeature = kab.data && v.city ? buildRegencyIndex(kab.data.features).get(cityKey(v.city)) : undefined;
  const kec = useGeo(cityFeature ? `/geo/kec/${cityFeature.properties?.kode}.json` : null);
  const districtFeature =
    kec.data && v.district ? kec.data.features.find((f) => placeKey(nameOf(f)) === placeKey(v.district)) : undefined;
  const kel = useGeo(districtFeature && cityFeature ? `/geo/kel/${cityFeature.properties?.kode}.json` : null);
  const namesUrl = districtFeature && cityFeature && kel.data === null ? `/geo/names/kel/${cityFeature.properties?.kode}.json` : null;
  const kelNames = useJson<{ name: string; district: string }[]>(namesUrl);

  const villageOptions = kel.data
    ? uniqSorted(
        kel.data.features
          .filter((f) => (f.properties as { district?: string }).district === districtFeature?.properties?.kode)
          .map(nameOf),
      )
    : uniqSorted((kelNames.data ?? []).filter((x) => placeKey(x.district) === placeKey(v.district)).map((x) => x.name));

  return {
    provinceOptions: uniqSorted((provinces.data?.features ?? []).map((f) => provinceLabel(nameOf(f)))),
    cityOptions: uniqSorted((kab.data?.features ?? []).map((f) => cityLabel(nameOf(f)))),
    districtOptions: uniqSorted((kec.data?.features ?? []).map(nameOf)),
    villageOptions,
    provinceLoading: provinces.loading,
    cityLoading: kab.loading,
    districtLoading: kec.loading,
    villageLoading: kel.loading || kelNames.loading,
  };
}
