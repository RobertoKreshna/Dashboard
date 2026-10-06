import * as React from "react";

/** Live `matchMedia` result; false on the server and during hydration. */
export function useMedia(query: string): boolean {
  return React.useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Phone-sized viewport (below Tailwind's `sm`). */
export const useIsPhone = () => useMedia("(max-width: 639px)");
/** Touch-first device: no hover, imprecise pointer. */
export const useIsTouch = () => useMedia("(pointer: coarse)");
