import { useEffect, useState } from "react";

/**
 * Returns true when the viewport matches the given CSS media query string.
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    window.addEventListener("resize", listener);
    return () => window.removeEventListener("resize", listener);
  }, [matches, query]);

  return matches;
}

/**
 * Convenience hook — returns true when the viewport width is ≤ 767 px.
 */
export function useIsMobile() {
  return useMediaQuery("(max-width: 767px)");
}
