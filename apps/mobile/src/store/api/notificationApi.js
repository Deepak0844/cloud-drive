// Shared API instance
import { api } from "@rtkQuery/api";

// Utils
import { UrlUtils } from "@shared-utils/utils";

// Constants
import { NotificationUrls } from "@constants/serviceUrls";
import { HttpMethods } from "@constants/httpConstants";
import { ApiTagTypes } from "@constants/generalConstants";

// Transformer
import NotificationTransformer from "./notificationTransformer";

// ---------------------------------------------------------------------------
// Endpoint Definitions
// ---------------------------------------------------------------------------

const getNotificationsQuery = () => ({
  query: (params) => ({ url: NotificationUrls.list, params }),
  transformResponse: NotificationTransformer.transformNotifications,
  providesTags: [ApiTagTypes.NOTIFICATIONS],
});

const markReadMutation = () => ({
  query: ({ id }) => ({
    url: UrlUtils.format(NotificationUrls.markRead, { id }),
    method: HttpMethods.patch,
  }),
  invalidatesTags: [ApiTagTypes.NOTIFICATIONS],
});

const markAllReadMutation = () => ({
  query: () => ({
    url: NotificationUrls.markAllRead,
    method: HttpMethods.patch,
  }),
  invalidatesTags: [ApiTagTypes.NOTIFICATIONS],
});

const registerPushTokenMutation = () => ({
  query: (body) => ({
    url: NotificationUrls.registerPushToken,
    method: HttpMethods.post,
    body,
  }),
});

// ---------------------------------------------------------------------------
// Inject Endpoints
// ---------------------------------------------------------------------------

export const notificationApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getNotifications: builder.query(getNotificationsQuery()),
    markRead: builder.mutation(markReadMutation()),
    markAllRead: builder.mutation(markAllReadMutation()),
    registerPushToken: builder.mutation(registerPushTokenMutation()),
  }),
  overrideExisting: false,
});

export const { useGetNotificationsQuery, useMarkReadMutation, useMarkAllReadMutation, useRegisterPushTokenMutation } =
  notificationApi;
