// Shared API instance
import { api } from "@rtkQuery/api";

// Utils
import { UrlUtils } from "@shared-utils/utils";

// Constants
import { AdminUrls } from "@constants/serviceUrls";
import { HttpMethods } from "@constants/httpConstants";
import { ApiTagTypes } from "@constants/generalConstants";

// Transformer
import AdminTransformer from "./adminTransformer";

// ---------------------------------------------------------------------------
// Endpoint Definitions
// ---------------------------------------------------------------------------

const getUsersQuery = () => ({
  query: (params) => ({ url: AdminUrls.users, params }),
  transformResponse: AdminTransformer.transformList,
  providesTags: [ApiTagTypes.ADMIN_USERS],
});

const updateUserQuotaMutation = () => ({
  query: ({ id, quota_bytes }) => ({
    url: UrlUtils.format(AdminUrls.userQuota, { id }),
    method: HttpMethods.patch,
    body: { quota_bytes },
  }),
  invalidatesTags: [ApiTagTypes.ADMIN_USERS, ApiTagTypes.QUOTA],
});

const updateUserStatusMutation = () => ({
  query: ({ id, is_active }) => ({
    url: UrlUtils.format(AdminUrls.userStatus, { id }),
    method: HttpMethods.patch,
    body: { is_active },
  }),
  invalidatesTags: [ApiTagTypes.ADMIN_USERS],
});

const getSystemStatsQuery = () => ({
  query: () => ({ url: AdminUrls.stats }),
  transformResponse: AdminTransformer.transformStats,
  providesTags: [ApiTagTypes.ADMIN_STATS],
});

const getQuotaRequestsQuery = () => ({
  query: (params) => ({ url: AdminUrls.quotaRequests, params }),
  transformResponse: AdminTransformer.transformList,
  providesTags: [ApiTagTypes.ADMIN_QUOTA_REQUESTS],
});

const approveQuotaMutation = () => ({
  query: ({ id }) => ({
    url: UrlUtils.format(AdminUrls.quotaRequest, { id }),
    method: HttpMethods.patch,
    body: { status: "approved" },
  }),
  invalidatesTags: [
    ApiTagTypes.ADMIN_QUOTA_REQUESTS,
    ApiTagTypes.ADMIN_USERS,
    ApiTagTypes.ADMIN_STATS,
    ApiTagTypes.QUOTA,
  ],
});

const rejectQuotaMutation = () => ({
  query: ({ id }) => ({
    url: UrlUtils.format(AdminUrls.quotaRequest, { id }),
    method: HttpMethods.patch,
    body: { status: "rejected" },
  }),
  invalidatesTags: [ApiTagTypes.ADMIN_QUOTA_REQUESTS, ApiTagTypes.ADMIN_USERS],
});

// ---------------------------------------------------------------------------
// Inject Endpoints
// ---------------------------------------------------------------------------

export const adminApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query(getUsersQuery()),
    updateUserQuota: builder.mutation(updateUserQuotaMutation()),
    updateUserStatus: builder.mutation(updateUserStatusMutation()),
    getSystemStats: builder.query(getSystemStatsQuery()),
    getQuotaRequests: builder.query(getQuotaRequestsQuery()),
    approveQuota: builder.mutation(approveQuotaMutation()),
    rejectQuota: builder.mutation(rejectQuotaMutation()),
  }),
  overrideExisting: false,
});

export const {
  useGetUsersQuery,
  useUpdateUserQuotaMutation,
  useUpdateUserStatusMutation,
  useGetSystemStatsQuery,
  useGetQuotaRequestsQuery,
  useApproveQuotaMutation,
  useRejectQuotaMutation,
} = adminApi;
