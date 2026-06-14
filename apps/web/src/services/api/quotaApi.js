// Constants
import { TagTypes } from "@constants/apiTags";
import { QuotaServiceUrls } from "@constants/serviceUrls";
import { HttpMethods } from "@shared-constants/constants/httpConstants";

// Services
import api from "./api";

// ---------------------------------------------------------------------------
// Endpoint Definitions
// ---------------------------------------------------------------------------

const getQuotaUsageQuery = () => ({
  query: () => ({
    url: QuotaServiceUrls.getQuotaUsage,
  }),
  transformResponse: (res) => res.data,
  providesTags: [TagTypes.QUOTA],
});

const getQuotaBreakdownQuery = () => ({
  query: () => ({
    url: QuotaServiceUrls.getQuotaBreakdown,
  }),
  transformResponse: (res) => res.data,
  providesTags: [TagTypes.QUOTA],
});

const requestQuotaIncreaseMutation = () => ({
  query: (body) => ({
    url: QuotaServiceUrls.requestQuotaIncrease,
    method: HttpMethods.POST,
    body,
  }),
  invalidatesTags: [TagTypes.QUOTA],
});

// ---------------------------------------------------------------------------
// Inject Endpoints
// ---------------------------------------------------------------------------

export const quotaApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getQuotaUsage: builder.query(getQuotaUsageQuery()),
    getQuotaBreakdown: builder.query(getQuotaBreakdownQuery()),
    requestQuotaIncrease: builder.mutation(requestQuotaIncreaseMutation()),
  }),
  overrideExisting: false,
});

export const { useGetQuotaUsageQuery, useGetQuotaBreakdownQuery, useRequestQuotaIncreaseMutation } = quotaApi;

export default quotaApi;
