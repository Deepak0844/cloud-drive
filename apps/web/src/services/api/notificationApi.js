import baseApi from "./api";
import { UrlUtils } from "@shared-utils/utils";
import { TagTypes } from "@constants/apiTags";
import { NotificationServiceUrls } from "@constants/serviceUrls";

/**
 * Notification API endpoints.
 */
const notificationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // GET /api/v1/notifications
    getNotifications: builder.query({
      query: (params) => ({
        url: NotificationServiceUrls.getNotificationList,
        params,
      }),
      providesTags: [TagTypes.NOTIFICATIONS],
    }),

    // PATCH /api/v1/notifications/:id/read
    markAsRead: builder.mutation({
      query: ({ id }) => ({
        url: UrlUtils.format(NotificationServiceUrls.markAsRead, { id }),
        method: "PATCH",
      }),
      invalidatesTags: [TagTypes.NOTIFICATIONS],
    }),

    // PATCH /api/v1/notifications/read-all
    markAllAsRead: builder.mutation({
      query: () => ({
        url: NotificationServiceUrls.markAllAsRead,
        method: "PATCH",
      }),
      invalidatesTags: [TagTypes.NOTIFICATIONS],
    }),
  }),
  overrideExisting: false,
});

export const { useGetNotificationsQuery, useMarkAsReadMutation, useMarkAllAsReadMutation } = notificationApi;

export default notificationApi;
