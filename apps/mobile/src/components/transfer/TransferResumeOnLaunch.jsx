import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";

// Services
import syncService from "@services/sync/syncService";

/**
 * Headless launch trigger: runs syncService.resumeTransfers() once per authenticated session on a
 * cold start.
 *
 * The AppState "active" handler in App.jsx only fires on a background→foreground *transition*, which
 * never happens on a cold launch (the process starts already "active"), so a transfer left mid-flight
 * when the app was killed would otherwise never be reconciled/resumed until the user backgrounded and
 * returned. This closes that case.
 *
 * It must be rendered INSIDE DatabaseGate: the gate withholds its children until the SQLite migrations
 * report success, so mounting here guarantees resumeTransfers()'s getByStatus read runs against a
 * ready database. App.jsx's own effects fire before the gate resolves and would race the migrations.
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
