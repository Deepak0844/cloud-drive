import { useEffect, useRef } from "react";
import { AppState } from "react-native";

/**
 * Runs `callback` each time the app returns to the foreground (AppState → "active"). The JS runtime
 * is suspended while backgrounded, so native onTransferEvent emissions that fire then are missed and
 * the transfer surfaces show stale progress until the next event — re-querying SQLite on foreground
 * closes that gap. The latest callback is held in a ref so the subscription is set up once.
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
