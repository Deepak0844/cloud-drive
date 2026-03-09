import baseApi from "./api";
import { TagTypes } from "@constants/apiTags";
import { QuotaServiceUrls } from "@constants/serviceUrls";

const quotaApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // GET /api/v1/quota/usage
    getQuotaUsage: builder.query({
      query: () => ({
        url: QuotaServiceUrls.getQuotaUsage,
      }),
      providesTags: [TagTypes.QUOTA],
    }),

    // GET /api/v1/quota/breakdown
    getQuotaBreakdown: builder.query({
      query: () => ({
        url: QuotaServiceUrls.getQuotaBreakdown,
      }),
      providesTags: [TagTypes.QUOTA],
    }),

    // POST /api/v1/quota/request
    requestQuotaIncrease: builder.mutation({
      query: (body) => ({
        url: QuotaServiceUrls.requestQuotaIncrease,
        method: "POST",
        body,
      }),
      invalidatesTags: [TagTypes.QUOTA],
    }),
  }),
  overrideExisting: false,
});

export const { useGetQuotaUsageQuery, useGetQuotaBreakdownQuery, useRequestQuotaIncreaseMutation } = quotaApi;

export default quotaApi;
