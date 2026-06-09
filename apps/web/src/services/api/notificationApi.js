// Utils
import { UrlUtils } from "@shared-utils/utils";

// Constants
import { TagTypes } from "@constants/apiTags";
import { NotificationServiceUrls } from "@constants/serviceUrls";
import { HttpMethods } from "@shared-constants/constants/httpConstants";

// Services
import api from "./api";

// ---------------------------------------------------------------------------
// Endpoint Definitions
// ---------------------------------------------------------------------------

const getNotificationsQuery = () => ({
  query: (params) => ({
    url: NotificationServiceUrls.getNotificationList,
    params,
  }),
  providesTags: [TagTypes.NOTIFICATIONS],
});

const markAsReadMutation = () => ({
  query: ({ id }) => ({
    url: UrlUtils.format(NotificationServiceUrls.markAsRead, { id }),
    method: HttpMethods.PATCH,
  }),
  invalidatesTags: [TagTypes.NOTIFICATIONS],
});

const markAllAsReadMutation = () => ({
  query: () => ({
    url: NotificationServiceUrls.markAllAsRead,
    method: HttpMethods.PATCH,
  }),
  invalidatesTags: [TagTypes.NOTIFICATIONS],
});

const registerWebPushSubscriptionMutation = () => ({
  query: (subscription) => ({
    url: NotificationServiceUrls.webPushSubscribe,
    method: HttpMethods.POST,
    body: subscription,
    onError: { suppressGlobalError: true },
  }),
});

// ---------------------------------------------------------------------------
// Inject Endpoints
// ---------------------------------------------------------------------------

export const notificationApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getNotifications: builder.query(getNotificationsQuery()),
    markAsRead: builder.mutation(markAsReadMutation()),
    markAllAsRead: builder.mutation(markAllAsReadMutation()),
    registerWebPushSubscription: builder.mutation(registerWebPushSubscriptionMutation()),
  }),
  overrideExisting: false,
});

export const {
  useGetNotificationsQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  useRegisterWebPushSubscriptionMutation,
} = notificationApi;

export default notificationApi;
