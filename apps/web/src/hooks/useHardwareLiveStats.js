// React core & third-party libraries
import { useEffect, useState } from "react";

// Utils
import SocketClient from "@services/socketClient";

// The event name matches SocketEvents.HARDWARE_STATS on the server
const HARDWARE_STATS_EVENT = "HARDWARE_STATS";

/**
 * Subscribes to the server's live HARDWARE_STATS socket pushes.
 * Seeds the initial state from the REST stats response (stats.system).
 *
 * @param {object|null} initialSystem - stats.system from useGetSystemStatsQuery
 * @returns {{ liveSystem: object|null, isLive: boolean }}
 */
export default function useHardwareLiveStats(initialSystem) {
  const [liveSystem, setLiveSystem] = useState(initialSystem ?? null);
  const [isLive, setIsLive] = useState(false);

  // Seed from REST response when it arrives for the first time
  useEffect(() => {
    if (initialSystem && !isLive) {
      setLiveSystem(initialSystem);
    }
  }, [initialSystem, isLive]);

  // Subscribe to socket pushes
  useEffect(() => {
    SocketClient.ensureConnected();
    const socket = SocketClient.getSocket();
    if (!socket) return;

    function handleStats(data) {
      setLiveSystem(data);
      setIsLive(true);
    }

    socket.on(HARDWARE_STATS_EVENT, handleStats);

    return () => {
      socket.off(HARDWARE_STATS_EVENT, handleStats);
    };
  }, []);

  return { liveSystem, isLive };
}
