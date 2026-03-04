import { notification } from "antd";
import baseApi from "./baseApi";
import { TagTypes } from "@/constants/apiTags";
import SocketClient from "@/services/socketClient";

// Socket event → RTK Query cache tag mapping
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

const socketApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    subscribeToSocketEvents: builder.query({
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
            dispatch(baseApi.util.invalidateTags(tags));

            // Display UI Toast for dedicated notification events
            if (event === "notification" && data) {
              const { title, message } = data;
              notification.info({
                message: title || "New Notification",
                description: message || "You have a new update.",
                placement: "bottomRight",
                duration: 5,
              });
            }
          };
          socket.on(event, handlers[event]);
        }

        // ── 3. Wait until this cache entry is removed (component unmount) ────
        await cacheEntryRemoved;

        // ── 4. Cleanup listeners ─────────────────────────────────────────────
        for (const [event, handler] of Object.entries(handlers)) {
          socket.off(event, handler);
        }
      },
    }),
  }),
  overrideExisting: false,
});

export const { useSubscribeToSocketEventsQuery } = socketApi;

export default socketApi;
