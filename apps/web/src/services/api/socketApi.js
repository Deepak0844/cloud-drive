// Utils
import { toast } from "sonner";
import SocketClient from "@services/socketClient";

// Constants
import { TagTypes } from "@constants/apiTags";
import { TIMEOUTS } from "@shared-constants/constants";

// Services
import api from "./api";

// ---------------------------------------------------------------------------
// Socket Event Mapping
// ---------------------------------------------------------------------------

const EVENT_TAG_MAP = {
  QUOTA_UPDATE: [TagTypes.QUOTA, TagTypes.ADMIN_STATS, TagTypes.ADMIN_USERS],
  FILE_CHANGE: [
    TagTypes.FILES,
    TagTypes.FOLDERS,
    TagTypes.TRASH,
    TagTypes.QUOTA,
    TagTypes.ADMIN_STATS,
    TagTypes.ADMIN_USERS,
  ],
  ITEM_BULK_CHANGE: [TagTypes.FILES, TagTypes.FOLDERS, TagTypes.QUOTA, TagTypes.ADMIN_STATS, TagTypes.ADMIN_USERS],
  notification: [TagTypes.NOTIFICATIONS],
  QUOTA_REQUEST: [TagTypes.ADMIN_QUOTA_REQUESTS],
};

// ---------------------------------------------------------------------------
// Endpoint Definitions
// ---------------------------------------------------------------------------

const subscribeToSocketEventsQuery = () => ({
  queryFn: () => ({ data: null }),

  async onCacheEntryAdded(_arg, { dispatch, cacheEntryRemoved }) {
    SocketClient.ensureConnected();
    const socket = SocketClient.getSocket();

    if (!socket) {
      return;
    }

    const handlers = {};

    for (const [event, tags] of Object.entries(EVENT_TAG_MAP)) {
      handlers[event] = (data) => {
        dispatch(api.util.invalidateTags(tags));

        // Display UI Toast for dedicated notification events
        if (event === "notification" && data) {
          const { title, message } = data;
          toast.info(title || "New Notification", {
            description: message || "You have a new update.",
            duration: TIMEOUTS.TOAST_PERSIST_MS,
          });
        }
      };
      socket.on(event, handlers[event]);
    }

    // Invalidate all socket-tracked tags on reconnect to catch any events missed during the gap
    const allTags = [...new Set(Object.values(EVENT_TAG_MAP).flat())];
    const onReconnect = () => dispatch(api.util.invalidateTags(allTags));
    socket.on("reconnect", onReconnect);

    // Wait until this cache entry is removed (component unmount)
    await cacheEntryRemoved;

    // Cleanup listeners
    for (const [event, handler] of Object.entries(handlers)) {
      socket.off(event, handler);
    }
    socket.off("reconnect", onReconnect);
  },
});

// ---------------------------------------------------------------------------
// Inject Endpoints
// ---------------------------------------------------------------------------

export const socketApi = api.injectEndpoints({
  endpoints: (builder) => ({
    subscribeToSocketEvents: builder.query(subscribeToSocketEventsQuery()),
  }),
  overrideExisting: false,
});

export const { useSubscribeToSocketEventsQuery } = socketApi;

export default socketApi;
