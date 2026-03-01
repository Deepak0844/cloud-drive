import baseApi from "./baseApi";
import { TagTypes } from "@/constants/apiTags";

/**
 * Admin API endpoints.
 * All routes require ADMIN role (enforced by the server middleware).
 */
const adminApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // GET /api/v1/admin/users
    getUsers: builder.query({
      query: (params) => ({
        url: "/admin/users",
        params,
      }),
      providesTags: [TagTypes.ADMIN_USERS],
    }),

    // PATCH /api/v1/admin/users/:id/quota
    updateUserQuota: builder.mutation({
      query: ({ id, quota_bytes }) => ({
        url: `/admin/users/${id}/quota`,
        method: "PATCH",
        body: { quota_bytes },
      }),
      invalidatesTags: [TagTypes.ADMIN_USERS],
    }),

    // PATCH /api/v1/admin/users/:id/status
    updateUserStatus: builder.mutation({
      query: ({ id, is_active }) => ({
        url: `/admin/users/${id}/status`,
        method: "PATCH",
        body: { is_active },
      }),
      invalidatesTags: [TagTypes.ADMIN_USERS],
    }),

    // GET /api/v1/admin/stats
    getSystemStats: builder.query({
      query: () => ({
        url: "/admin/stats",
      }),
      providesTags: [TagTypes.ADMIN_STATS],
    }),

    // GET /api/v1/admin/quota-requests
    getAllQuotaRequests: builder.query({
      query: (params) => ({
        url: "/admin/quota-requests",
        params,
      }),
      providesTags: [TagTypes.ADMIN_QUOTA_REQUESTS],
    }),

    // PATCH /api/v1/admin/quota-requests/:id
    handleQuotaRequest: builder.mutation({
      query: ({ id, status }) => ({
        url: `/admin/quota-requests/${id}`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: [TagTypes.ADMIN_QUOTA_REQUESTS],
    }),

    // POST /api/v1/admin/storage/re-analyze
    runStorageReanalysis: builder.mutation({
      query: (body) => ({
        url: "/admin/storage/re-analyze",
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
