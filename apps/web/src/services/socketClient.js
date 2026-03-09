import { io } from "socket.io-client";

// Utils
import AuthUtils from "@utils/authUtils";

/**
 * Socket.io client singleton.
 *
 * Designed to be imported ONLY by the RTK Query layer (customBaseQuery / socketApi).
 * All event listeners are registered in socketApi's onCacheEntryAdded lifecycle.
 */

let socket = null;

/**
 * Connect to the socket server if not already connected and user is authenticated.
 * Called automatically by customBaseQuery on each HTTP request.
 */
function ensureConnected() {
  const token = AuthUtils.getToken();
  if (!token) return; // Not authenticated — do nothing

  // If socket exists (even if still connecting), do not recreate it
  if (socket) return;

  // NOTE: We no longer lazily recreate the socket solely because it disconnected,
  // Socket.io handles automatic reconnections internally.
  // We only disconnect/recreate explicitly on auth token changes (logout/login).

  socket = io("/", {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
    autoConnect: true,
  });
}

/**
 * Get the socket instance (may be null if not yet connected).
 * @returns {import("socket.io-client").Socket | null}
 */
function getSocket() {
  return socket;
}

/**
 * Disconnect and destroy the socket (called on logout).
 */
function disconnect() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

const SocketClient = {
  ensureConnected,
  getSocket,
  disconnect,
};

export default SocketClient;
