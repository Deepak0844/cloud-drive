import { useEffect, useRef } from "react";
import { AppState } from "react-native";

/**
 * Runs `callback` each time the app returns to the foreground (AppState → "active").
 *
 * The transfer surfaces (upload sheet, FAB badge, file-detail download row) are driven by native
 * onTransferEvent emissions, but the JS runtime is suspended while the app is backgrounded, so any
 * event that fired in the background is missed — the UI then shows stale progress until the next
 * event after foregrounding, reading as "stuck." Re-querying SQLite on foreground closes that gap.
 *
 * The latest callback is held in a ref so the AppState subscription is set up once and never needs
 * to be torn down and re-added just because the caller passes a new closure each render.
 */
export function useAppStateActive(callback) {
  const savedCallback = useRef(callback);
  savedCallback.current = callback;

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") {
        savedCallback.current?.();
      }
    });
    return () => sub.remove();
  }, []);
}
