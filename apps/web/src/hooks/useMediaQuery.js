// Hooks
import { useMediaQuery } from "@shared-hooks/hooks";

/**
 * Convenience hook — returns true when the viewport width is ≤ 767 px.
 * useMediaQuery itself lives in shared/hooks and is re-exported from there.
 */
export function useIsMobile() {
  return useMediaQuery("(max-width: 767px)");
}
