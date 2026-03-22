// Shared utils
import { UrlUtils } from "@shared-utils/utils";

// Constants
import { TagTypes } from "@constants/apiTags";
import { AdminServiceUrls } from "@constants/serviceUrls";
import { HttpMethods } from "@shared-constants/constants/httpConstants";

// Services
import api from "./api";

// ---------------------------------------------------------------------------
// Endpoint Definitions
// ---------------------------------------------------------------------------

const getUsersQuery = () => ({
  query: (params) => ({
    url: AdminServiceUrls.getUsers,
    params,
  }),
  providesTags: [TagTypes.ADMIN_USERS],
});

const updateUserQuotaMutation = () => ({
  query: ({ id, quota_bytes }) => ({
    url: UrlUtils.format(AdminServiceUrls.updateUserQuota, { id }),
    method: HttpMethods.PATCH,
    body: { quota_bytes },
  }),
  invalidatesTags: [TagTypes.ADMIN_USERS, TagTypes.QUOTA],
});

const updateUserStatusMutation = () => ({
  query: ({ id, is_active }) => ({
    url: UrlUtils.format(AdminServiceUrls.updateUserStatus, { id }),
    method: HttpMethods.PATCH,
    body: { is_active },
  }),
  invalidatesTags: [TagTypes.ADMIN_USERS],
});

const getSystemStatsQuery = () => ({
  query: () => ({
    url: AdminServiceUrls.getSystemStats,
  }),
  providesTags: [TagTypes.ADMIN_STATS],
});

const getAllQuotaRequestsQuery = () => ({
  query: (params) => ({
    url: AdminServiceUrls.getAllQuotaRequests,
    params,
  }),
  providesTags: [TagTypes.ADMIN_QUOTA_REQUESTS],
});

const handleQuotaRequestMutation = () => ({
  query: ({ id, status }) => ({
    url: UrlUtils.format(AdminServiceUrls.handleQuotaRequest, { id }),
    method: HttpMethods.PATCH,
    body: { status },
  }),
  invalidatesTags: [TagTypes.ADMIN_QUOTA_REQUESTS, TagTypes.ADMIN_USERS, TagTypes.ADMIN_STATS, TagTypes.QUOTA],
});

const runStorageReanalysisMutation = () => ({
  query: (body) => ({
    url: AdminServiceUrls.runStorageReanalysis,
    method: HttpMethods.POST,
    body,
  }),
  invalidatesTags: [TagTypes.ADMIN_USERS, TagTypes.ADMIN_STATS],
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
    getAllQuotaRequests: builder.query(getAllQuotaRequestsQuery()),
    handleQuotaRequest: builder.mutation(handleQuotaRequestMutation()),
    runStorageReanalysis: builder.mutation(runStorageReanalysisMutation()),
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
