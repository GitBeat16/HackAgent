"use client";

import { useEffect, useState } from "react";

/** Reactive `matchMedia` hook, e.g. `useMediaQuery("(min-width: 1024px)")`. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);
    setMatches(mediaQueryList.matches);

    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);
    mediaQueryList.addEventListener("change", listener);
    return () => mediaQueryList.removeEventListener("change", listener);
  }, [query]);

  return matches;
}

/** Convenience wrapper matching the design system's `lg` breakpoint. */
export function useIsDesktop() {
  return useMediaQuery("(min-width: 1024px)");
}
