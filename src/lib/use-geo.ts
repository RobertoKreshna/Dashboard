"use client";

import * as React from "react";
import type { FeatureCollection } from "geojson";

/** Boundary tiles from /public/geo, loaded on demand and cached for the session. `data: null` = tile does not exist. */
const tileCache = new Map<string, FeatureCollection | null>(); // null = tile doesn't exist

export function useGeo(url: string | null): { data: FeatureCollection | null | undefined; loading: boolean } {
  const [, bump] = React.useState(0);
  React.useEffect(() => {
    if (!url || tileCache.has(url)) return;
    let dead = false;
    fetch(url)
      .then((r) => (r.ok ? (r.json() as Promise<FeatureCollection>) : null))
      .catch(() => null)
      .then((d) => {
        tileCache.set(
          url,
          d ? { ...d, features: d.features.map((f, i) => ({ ...f, properties: { ...f.properties, uid: `${url}#${i}` } })) } : null,
        );
        if (!dead) bump((n) => n + 1);
      });
    return () => {
      dead = true;
    };
  }, [url]);
  const cached = !!url && tileCache.has(url);
  const data = cached ? tileCache.get(url!) : undefined;
  const loading = !!url && !cached;
  // Stable identity: a new wrapper object each render would rebuild (and redraw) the whole map.
  return React.useMemo(() => ({ data, loading }), [data, loading]);
}

const jsonCache = new Map<string, unknown>();

/** Small JSON files from /public/geo (e.g. village-name lists). `data: null` = file does not exist. */
export function useJson<T>(url: string | null): { data: T | null | undefined; loading: boolean } {
  const [, bump] = React.useState(0);
  React.useEffect(() => {
    if (!url || jsonCache.has(url)) return;
    let dead = false;
    fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((d) => {
        jsonCache.set(url, d);
        if (!dead) bump((n) => n + 1);
      });
    return () => {
      dead = true;
    };
  }, [url]);
  const cached = !!url && jsonCache.has(url);
  const data = cached ? (jsonCache.get(url!) as T | null) : undefined;
  const loading = !!url && !cached;
  return React.useMemo(() => ({ data, loading }), [data, loading]);
}
