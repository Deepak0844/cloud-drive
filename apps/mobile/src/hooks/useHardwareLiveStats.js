import { useState, useEffect } from "react";

// Services
import socketClient from "@services/socketClient";

// Matches SocketEvents.HARDWARE_STATS on the server; pushed to admins every 5s.
const HARDWARE_STATS_EVENT = "HARDWARE_STATS";

/**
 * Live hardware stats for the admin dashboard. Seeds from the REST snapshot
 * (getSystemStats().system) and then follows the server's socket pushes.
 *
 * @param {object|null} initialStats - `system` object from useGetSystemStatsQuery
 * @returns {object|null} latest { cpu, memory, disk } stats
 */
export function useHardwareLiveStats(initialStats = null) {
  const [stats, setStats] = useState(initialStats);

  useEffect(() => {
    if (initialStats && !stats) {
      setStats(initialStats);
    }
  }, [initialStats, stats]);

  useEffect(() => {
    function handleStats(payload) {
      if (payload) setStats(payload);
    }
    socketClient.on(HARDWARE_STATS_EVENT, handleStats);
    return () => socketClient.off(HARDWARE_STATS_EVENT, handleStats);
  }, []);

  return stats;
}
