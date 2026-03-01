import baseApi from "./baseApi";
import { TagTypes } from "@/constants/apiTags";

/**
 * Notification API endpoints.
 */
const notificationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // GET /api/v1/notifications
    getNotifications: builder.query({
      query: (params) => ({
        url: "/notifications",
        params,
      }),
      providesTags: [TagTypes.NOTIFICATIONS],
    }),

    // PATCH /api/v1/notifications/:id/read
    markAsRead: builder.mutation({
      query: ({ id }) => ({
        url: `/notifications/${id}/read`,
        method: "PATCH",
      }),
      invalidatesTags: [TagTypes.NOTIFICATIONS],
    }),

    // PATCH /api/v1/notifications/read-all
    markAllAsRead: builder.mutation({
      query: () => ({
        url: "/notifications/read-all",
        method: "PATCH",
      }),
      invalidatesTags: [TagTypes.NOTIFICATIONS],
    }),
  }),
  overrideExisting: false,
});

export const { useGetNotificationsQuery, useMarkAsReadMutation, useMarkAllAsReadMutation } = notificationApi;

export default notificationApi;
