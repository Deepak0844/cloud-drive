import baseApi from "./api";
import { UrlUtils } from "@shared-utils/utils";
import { TagTypes } from "@constants/apiTags";
import { AdminServiceUrls } from "@constants/serviceUrls";

/**
 * Admin API endpoints.
 * All routes require ADMIN role (enforced by the server middleware).
 */
const adminApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // GET /api/v1/admin/users
    getUsers: builder.query({
      query: (params) => ({
        url: AdminServiceUrls.getUsers,
        params,
      }),
      providesTags: [TagTypes.ADMIN_USERS],
    }),

    // PATCH /api/v1/admin/users/:id/quota
    updateUserQuota: builder.mutation({
      query: ({ id, quota_bytes }) => ({
        url: UrlUtils.format(AdminServiceUrls.updateUserQuota, { id }),
        method: "PATCH",
        body: { quota_bytes },
      }),
      invalidatesTags: [TagTypes.ADMIN_USERS, TagTypes.QUOTA],
    }),

    // PATCH /api/v1/admin/users/:id/status
    updateUserStatus: builder.mutation({
      query: ({ id, is_active }) => ({
        url: UrlUtils.format(AdminServiceUrls.updateUserStatus, { id }),
        method: "PATCH",
        body: { is_active },
      }),
      invalidatesTags: [TagTypes.ADMIN_USERS],
    }),

    // GET /api/v1/admin/stats
    getSystemStats: builder.query({
      query: () => ({
        url: AdminServiceUrls.getSystemStats,
      }),
      providesTags: [TagTypes.ADMIN_STATS],
    }),

    // GET /api/v1/admin/quota-requests
    getAllQuotaRequests: builder.query({
      query: (params) => ({
        url: AdminServiceUrls.getAllQuotaRequests,
        params,
      }),
      providesTags: [TagTypes.ADMIN_QUOTA_REQUESTS],
    }),

    // PATCH /api/v1/admin/quota-requests/:id
    handleQuotaRequest: builder.mutation({
      query: ({ id, status }) => ({
        url: UrlUtils.format(AdminServiceUrls.handleQuotaRequest, { id }),
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: [TagTypes.ADMIN_QUOTA_REQUESTS],
    }),

    // POST /api/v1/admin/storage/re-analyze
    runStorageReanalysis: builder.mutation({
      query: (body) => ({
        url: AdminServiceUrls.runStorageReanalysis,
        method: "POST",
        body,
      }),
      invalidatesTags: [TagTypes.ADMIN_USERS, TagTypes.ADMIN_STATS],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetUsersQuery,
  useUpdateUserQuotaMutation,
  useUpdateUserStatusMutation,
  useGetSystemStatsQuery,
  useGetAllQuotaRequestsQuery,
  useHandleQuotaRequestMutation,
  useRunStorageReanalysisMutation,
} = adminApi;

export default adminApi;
