import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";

// Services
import syncService from "@services/sync/syncService";

/**
 * Headless launch trigger: runs syncService.resumeTransfers() once per authenticated session on cold
 * start. App.jsx's AppState "active" handler only fires on a background→foreground transition, which
 * never happens on a cold launch, so a transfer killed mid-flight would otherwise stay unresumed until
 * the user backgrounded and returned. Must render INSIDE DatabaseGate so the getByStatus read runs
 * against a migrated database (App.jsx's own effects would race the migrations).
 */
export default function TransferResumeOnLaunch() {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const hasRun = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || hasRun.current) return;
    hasRun.current = true;
    syncService.resumeTransfers?.().catch(() => {});
  }, [isAuthenticated]);

  return null;
}
