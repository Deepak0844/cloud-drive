// Shared API instance
import { api } from "@rtkQuery/api";

// Constants
import { QuotaUrls } from "@constants/serviceUrls";
import { HttpMethods } from "@constants/httpConstants";
import { ApiTagTypes } from "@constants/generalConstants";

// Transformer
import QuotaTransformer from "./quotaTransformer";

// ---------------------------------------------------------------------------
// Endpoint Definitions
// ---------------------------------------------------------------------------

const getQuotaUsageQuery = () => ({
  query: () => ({ url: QuotaUrls.usage }),
  transformResponse: QuotaTransformer.transformQuota,
  providesTags: [ApiTagTypes.QUOTA],
});

const getQuotaBreakdownQuery = () => ({
  query: () => ({ url: QuotaUrls.breakdown }),
  transformResponse: QuotaTransformer.transformQuota,
  providesTags: [ApiTagTypes.QUOTA],
});

const requestQuotaMutation = () => ({
  query: (body) => ({
    url: QuotaUrls.request,
    method: HttpMethods.post,
    body,
  }),
  invalidatesTags: [ApiTagTypes.QUOTA],
});

// ---------------------------------------------------------------------------
// Inject Endpoints
// ---------------------------------------------------------------------------

export const quotaApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getQuotaUsage: builder.query(getQuotaUsageQuery()),
    getQuotaBreakdown: builder.query(getQuotaBreakdownQuery()),
    requestQuota: builder.mutation(requestQuotaMutation()),
  }),
  overrideExisting: false,
});

export const { useGetQuotaUsageQuery, useGetQuotaBreakdownQuery, useRequestQuotaMutation } = quotaApi;
